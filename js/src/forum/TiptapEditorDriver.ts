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
    if ((markedInstance as any).__lb_patched_orderedList) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    let orderedListIdx = -1;
    for (let i = 0; i < blockExt.length; i++) {
        try {
            const result = blockExt[i]('1. test');
            if (result && result.type === 'list' && result.ordered === true) {
                orderedListIdx = i;
                break;
            }
        } catch (e) {}
    }

    if (orderedListIdx === -1) return;

    const originalTokenizer = blockExt[orderedListIdx];

    const patchedTokenizer = function(this: any, src: string, tokens?: any[], lexer?: any) {
        const result = originalTokenizer.call(this, src, tokens, lexer);

        if (result && result.type === 'list' && result.ordered && result.items) {
            result.items.forEach((item: any) => {
                if (item.tokens && item.tokens[0] && item.tokens[0].type === 'paragraph') {
                    const paragraph = item.tokens[0];
                    const raw = paragraph.raw;

                    if (raw && /^>![^\s]/.test(raw)) {
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

    blockExt[orderedListIdx] = patchedTokenizer;
    (markedInstance as any).__lb_patched_orderedList = true;
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

        // Patch for orderedList (needed for list items with spoiler syntax)
        if (this.editor.markdown?.markedInstance) {
            patchMarkedOrderedList(this.editor.markdown.markedInstance);
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
