import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { marked, Marked } from 'marked';
import { SpoilerInline, SpoilerInlineParagraph, SpoilerBlock } from './extensions';

// 配置外部干净的 marked 全局实例
// webpack alias 确保这是从 node_modules/marked ESM 导入的干净版本
marked.setOptions({ gfm: true, breaks: false });
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { EditorDriverParams } from 'flarum/common/utils/EditorDriverInterface';

interface TiptapEditorParams extends EditorDriverParams {
    escape?: () => void;
}

export default class TiptapEditorDriver implements EditorDriverInterface {
    el!: HTMLElement;
    editor: Editor | null = null;
    private params: TiptapEditorParams | null = null;
    private inputListeners: Function[] = [];
    private inputListenerTimeout: number | null = null;
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
                    link: { openOnClick: false },
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
                // Spoiler 扩展 - 必须在 Markdown 之前注册
                SpoilerInline,
                SpoilerInlineParagraph,  // 处理行首的 >!text!< 避免与 blockquote 冲突
                SpoilerBlock,
                // Markdown 扩展 - 使用外部干净的 marked 实例
                // webpack alias 确保 marked 是干净的 ESM 版本，避免 em/strong 解析 bug
                Markdown.configure({
                    marked,
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

        // 初始化后正确加载 markdown 内容
        if (params.value) {
            this.editor.commands.setContent(params.value, {
                contentType: 'markdown',
                emitUpdate: false,
            });
        }

        // 修复 TaskItem checkbox 点击问题
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

    /**
     * 修复 @tiptap/markdown 内置 Marked 实例的 em/strong 解析 bug（备用方案）
     * 
     * 问题根源：@tiptap/markdown 打包时，把 Unicode 属性转义展开成巨型正则，
     * 破坏了 em/strong 的匹配逻辑。
     * 
     * 主要方案：通过 Markdown.configure({ marked }) 传入干净实例
     * 备用方案：如果 configure 无效，在此完全替换实例
     */
    private replaceMarkedInstance(): void {
        if (!this.editor?.markdown) return;
        
        const mdManager = this.editor.markdown as any;
        const currentMarked = mdManager.instance ?? mdManager.markedInstance;
        if (!currentMarked) return;
        
        // 检查当前实例是否已经是干净的（规则中包含 \p{P}）
        const currentRule = currentMarked.Lexer?.rules?.inline?.gfm?.emStrongLDelim;
        if (currentRule && String(currentRule).includes('\\p{P}')) {
            // 已经是干净实例，无需替换
            return;
        }
        
        // 需要替换：创建干净的 Marked 实例
        const cleanMarked = new Marked();
        cleanMarked.setOptions({ gfm: true, breaks: false });
        
        // 迁移自定义扩展（@tiptap/markdown 注册的 Spoiler 等 tokenizer）
        const extensions = currentMarked.defaults?.extensions;
        if (extensions) {
            const customExtensions: any[] = [];
            
            if (Array.isArray(extensions.block)) {
                for (const ext of extensions.block) {
                    if (ext && ext.name) {
                        customExtensions.push(ext);
                    }
                }
            }
            
            if (Array.isArray(extensions.inline)) {
                for (const ext of extensions.inline) {
                    if (ext && ext.name) {
                        customExtensions.push(ext);
                    }
                }
            }
            
            if (customExtensions.length > 0) {
                cleanMarked.use({ extensions: customExtensions });
            }
        }
        
        // 完全替换实例
        if ('markedInstance' in mdManager) {
            mdManager.markedInstance = cleanMarked;
        } else if ('instance' in mdManager) {
            mdManager.instance = cleanMarked;
        }
    }

    private handleUpdate(): void {
        this.params?.oninput(this.getValue());
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
