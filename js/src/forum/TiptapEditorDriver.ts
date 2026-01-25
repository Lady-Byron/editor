import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Marked } from 'marked';
import { 
    SpoilerInline, 
    SpoilerInlineParagraph, 
    SpoilerBlock,
    SubscriptMark,
    SuperscriptMark,
    BlankLine,
    LbIndent,
    CustomLink,
    AlignedBlock,
    TextColor,
    TextSize,
} from './extensions';
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { EditorDriverParams } from 'flarum/common/utils/EditorDriverInterface';

interface TiptapEditorParams extends EditorDriverParams {
    escape?: () => void;
}

function createCleanMarkedInstance(): InstanceType<typeof Marked> {
    const marked = new Marked();
    marked.setOptions({ gfm: true, breaks: false });
    return marked;
}

/**
 * Patch marked instance to fix orderedList tokenizer issue.
 * 
 * Tiptap's custom orderedList tokenizer uses inlineTokens() instead of blockTokens()
 * when processing list item content, which bypasses block-level tokenizers like
 * spoiler_inline_paragraph. This patch re-processes list items that match spoiler syntax.
 */
function patchMarkedOrderedList(markedInstance: InstanceType<typeof Marked>): void {
    // 幂等检查：防止重复 patch
    if ((markedInstance as any).__lb_patched_orderedList) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    // Find the orderedList tokenizer by testing
    let orderedListIdx = -1;
    for (let i = 0; i < blockExt.length; i++) {
        try {
            const result = blockExt[i]('1. test');
            if (result && result.type === 'list' && result.ordered === true) {
                orderedListIdx = i;
                break;
            }
        } catch (e) {
            // Ignore errors from other tokenizers
        }
    }

    if (orderedListIdx === -1) return;

    const originalTokenizer = blockExt[orderedListIdx];

    // Create patched version - 透传所有参数
    const patchedTokenizer = function(this: any, src: string, tokens?: any[], lexer?: any) {
        const result = originalTokenizer.call(this, src, tokens, lexer);

        if (result && result.type === 'list' && result.ordered && result.items) {
            result.items.forEach((item: any) => {
                if (item.tokens && item.tokens[0] && item.tokens[0].type === 'paragraph') {
                    const paragraph = item.tokens[0];
                    const raw = paragraph.raw;

                    // Check if content matches spoiler_inline_paragraph syntax
                    // Pattern: starts with >! followed by non-whitespace (not ">! " which is block spoiler)
                    if (raw && /^>![^\s]/.test(raw)) {
                        // Re-tokenize using block lexer to properly handle spoiler syntax
                        const reTokenized = markedInstance.lexer(raw);
                        if (reTokenized[0] && reTokenized[0].type !== 'paragraph') {
                            item.tokens = reTokenized;
                        }
                    }
                }
            });
        }

        return result;
    };

    // Replace the tokenizer
    blockExt[orderedListIdx] = patchedTokenizer;
    
    // 标记已 patch
    (markedInstance as any).__lb_patched_orderedList = true;
}

/**
 * Patch marked instance to fix block tokenizer lexer issue.
 * 
 * Problem: Block tokenizers receive a lexer parameter that doesn't have custom 
 * extensions configured. When they call lexer.inlineTokens(), custom inline syntax 
 * (like subscript, superscript, spoiler_inline) won't be recognized.
 * 
 * Solution: Create a fresh, properly configured lexer for each tokenizer call
 * instead of using the broken one they receive.
 * 
 * Note: We create a new lexer instance each time because Lexer is stateful
 * (holds tokens array, link state, line numbers, etc.). Reusing a single instance
 * could cause state pollution between parse calls.
 * 
 * Affected block tokenizers:
 * - spoiler_inline_paragraph: needs lexer.inlineTokens() for nested inline content
 * - spoiler_block: needs lexer.inlineTokens() for paragraph content
 * - aligned_block: needs lexer.blockTokens() and lexer.inlineTokens() for nested content
 */
function patchMarkedBlockTokenizers(markedInstance: InstanceType<typeof Marked>): void {
    // 幂等检查：防止重复 patch
    if ((markedInstance as any).__lb_patched_blockTokenizers) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    const LexerClass = (markedInstance as any).Lexer;
    if (!LexerClass) return;

    const defaults = markedInstance.defaults;

    // Block tokenizers that need patching (those that use lexer.inlineTokens or lexer.blockTokens)
    const tokenizersToPatch = ['spoiler_inline_paragraph', 'spoiler_block', 'aligned_block'];

    // Test strings to identify each tokenizer
    const testStrings: Record<string, string> = {
        'spoiler_inline_paragraph': '>!test!<',
        'spoiler_block': '>! test',
        'aligned_block': '[center]\ntest\n[/center]',
    };

    tokenizersToPatch.forEach(tokenType => {
        const testStr = testStrings[tokenType];
        if (!testStr) return;

        // Find the tokenizer by testing
        let tokenizerIdx = -1;
        for (let i = 0; i < blockExt.length; i++) {
            try {
                const result = blockExt[i](testStr);
                if (result && result.type === tokenType) {
                    tokenizerIdx = i;
                    break;
                }
            } catch (e) {
                // Ignore errors from other tokenizers
            }
        }

        if (tokenizerIdx === -1) return;

        const originalTokenizer = blockExt[tokenizerIdx];

        // Create patched version
        // 每次调用创建新的 lexer 实例，避免状态污染
        const patchedTokenizer = function(this: any, src: string, tokens?: any[], lexer?: any) {
            // Create a fresh lexer with proper extensions for each call
            const freshLexer = new LexerClass(defaults);
            // Call original tokenizer with the fresh, properly configured lexer
            return originalTokenizer.call(this, src, tokens, freshLexer);
        };

        // Replace the tokenizer
        blockExt[tokenizerIdx] = patchedTokenizer;
    });

    // 标记已 patch
    (markedInstance as any).__lb_patched_blockTokenizers = true;
}

export default class TiptapEditorDriver implements EditorDriverInterface {
    el!: HTMLElement;
    editor: Editor | null = null;
    private params: TiptapEditorParams | null = null;
    private inputListeners: Function[] = [];
    private inputListenerTimeout: number | null = null;
    private oninputTimeout: number | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private taskItemClickHandler: ((e: MouseEvent) => void) | null = null;

    build(dom: HTMLElement, params: TiptapEditorParams): void {
        this.params = params;
        this.inputListeners = params.inputListeners || [];

        this.el = document.createElement('div');
        this.el.className = ['TiptapEditor', 'FormControl', ...params.classNames].join(' ');
        dom.appendChild(this.el);

        this.editor = new Editor({
            element: this.el,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3, 4, 5, 6] },
                    link: false,
                }),
                Placeholder.configure({ placeholder: params.placeholder || '' }),
                TaskList.configure({
                    HTMLAttributes: {
                        class: 'task-list',
                    },
                }),
                TaskItem.configure({
                    nested: true,
                    HTMLAttributes: {
                        class: 'task-item',
                    },
                }),
                TableKit.configure({
                    table: {
                        resizable: false,
                        HTMLAttributes: {
                            class: 'tiptap-table',
                        },
                    },
                    tableRow: {
                        HTMLAttributes: {
                            class: 'tiptap-table-row',
                        },
                    },
                    tableCell: {
                        HTMLAttributes: {
                            class: 'tiptap-table-cell',
                        },
                    },
                    tableHeader: {
                        HTMLAttributes: {
                            class: 'tiptap-table-header',
                        },
                    },
                }),
                CustomLink.configure({
                    openOnClick: false,
                }),
                SpoilerInline,
                SpoilerInlineParagraph,
                SpoilerBlock,
                SubscriptMark,
                SuperscriptMark,
                BlankLine,
                LbIndent,
                AlignedBlock,
                TextColor,
                TextSize,
                Markdown.configure({
                    marked: createCleanMarkedInstance(),
                }),
            ],
            content: '',
            editable: !params.disabled,
            onUpdate: () => this.handleUpdate(),
            onSelectionUpdate: () => this.triggerInputListeners(),
            onFocus: () => this.el.classList.add('focused'),
            onBlur: () => this.el.classList.remove('focused'),
            editorProps: {
                transformPastedHTML(html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const dataImageRegex = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;
                    doc.querySelectorAll('img').forEach((img) => {
                        if (dataImageRegex.test(img.src)) img.remove();
                    });
                    return doc.body.innerHTML;
                },
            },
        });

        // Patch marked instance to fix parsing issues
        // These patches are idempotent - safe to call multiple times
        if (this.editor.markdown?.markedInstance) {
            patchMarkedOrderedList(this.editor.markdown.markedInstance);
            patchMarkedBlockTokenizers(this.editor.markdown.markedInstance);
        }

        if (params.value) {
            this.editor.commands.setContent(params.value, {
                contentType: 'markdown',
                emitUpdate: false,
            });
        }

        this.taskItemClickHandler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const checkbox = target.closest('.task-item label')?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            if (checkbox && (target === checkbox || target.closest('label'))) {
                e.stopImmediatePropagation();
                setTimeout(() => {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }, 0);
            }
        };
        this.el.addEventListener('mousedown', this.taskItemClickHandler, true);

        this.keydownHandler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.params?.onsubmit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.params?.escape?.();
            }
        };
        this.el.addEventListener('keydown', this.keydownHandler);
    }

    private handleUpdate(): void {
        if (this.oninputTimeout) clearTimeout(this.oninputTimeout);
        this.oninputTimeout = window.setTimeout(() => {
            this.params?.oninput(this.getValue());
        }, 50);
        this.triggerInputListeners();
    }

    private triggerInputListeners(): void {
        if (this.inputListenerTimeout) clearTimeout(this.inputListenerTimeout);
        this.inputListenerTimeout = window.setTimeout(() => {
            this.inputListeners.forEach((fn) => { try { fn(); } catch (e) {} });
        }, 50);
    }

    getValue(): string {
        if (!this.editor) return '';
        return this.editor.getMarkdown();
    }

    setValue(value: string): void {
        if (!this.editor) return;
        this.editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    }

    getSelectionRange(): Array<number> {
        if (!this.editor) return [0, 0];
        const { from, to } = this.editor.state.selection;
        return [from, to];
    }

    moveCursorTo(position: number): void {
        this.editor?.commands.setTextSelection(position);
    }

    insertAtCursor(text: string, escape: boolean = false): void {
        if (!this.editor) return;
        if (escape) {
            const { from, to } = this.editor.state.selection;
            this.editor.view.dispatch(this.editor.state.tr.insertText(text, from, to));
        } else {
            this.editor.commands.insertContent(text);
        }
    }

    insertAt(pos: number, text: string, escape: boolean = false): void {
        this.insertBetween(pos, pos, text, escape);
    }

    insertBetween(start: number, end: number, text: string, escape: boolean = false): void {
        if (!this.editor) return;
        if (escape) {
            this.editor.view.dispatch(this.editor.state.tr.insertText(text, start, end));
        } else {
            this.editor.chain().focus().insertContentAt({ from: start, to: end }, text).run();
        }
    }

    replaceBeforeCursor(start: number, text: string, escape: boolean = false): void {
        const [cursorPos] = this.getSelectionRange();
        this.insertBetween(start, cursorPos, text, escape);
    }

    getLastNChars(n: number): string {
        if (!this.editor) return '';
        const { $from } = this.editor.state.selection;
        const nodeBefore = $from.nodeBefore;
        if (!nodeBefore || !nodeBefore.text) return '';
        return nodeBefore.text.slice(Math.max(0, nodeBefore.text.length - n));
    }

    getCaretCoordinates(position?: number): { left: number; top: number } {
        if (!this.editor?.view) return { top: 0, left: 0 };
        const pos = position ?? this.editor.state.selection.from;
        const coords = this.editor.view.coordsAtPos(pos);
        const editorRect = this.el.getBoundingClientRect();
        return {
            top: coords.top - editorRect.top + this.el.scrollTop,
            left: coords.left - editorRect.left + this.el.scrollLeft
        };
    }

    focus(): void {
        this.editor?.commands.focus();
    }

    destroy(): void {
        if (this.inputListenerTimeout) clearTimeout(this.inputListenerTimeout);
        if (this.oninputTimeout) clearTimeout(this.oninputTimeout);
        if (this.keydownHandler) {
            this.el.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        if (this.taskItemClickHandler) {
            this.el.removeEventListener('mousedown', this.taskItemClickHandler, true);
            this.taskItemClickHandler = null;
        }
        this.editor?.destroy();
        this.editor = null;
        this.el?.parentNode?.removeChild(this.el);
    }

    disabled(isDisabled: boolean): void {
        this.editor?.setEditable(!isDisabled);
        this.el.classList.toggle('disabled', isDisabled);
    }
}
