import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { EditorDriverParams } from 'flarum/common/utils/EditorDriverInterface';

// 扩展 EditorDriverParams 以包含自定义属性
interface TiptapEditorParams extends EditorDriverParams {
    escape?: () => void;
}

/**
 * TiptapEditorDriver - Implements Flarum's EditorDriverInterface
 * 完整实现 Flarum 编辑器驱动接口，确保与 mentions/emoji/upload 等插件兼容
 */
export default class TiptapEditorDriver implements EditorDriverInterface {
    el!: HTMLElement;
    editor: Editor | null = null;
    private params: TiptapEditorParams | null = null;
    private inputListeners: Function[] = [];
    private inputListenerTimeout: number | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    /**
     * Build the editor instance
     */
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
                    link: {
                        openOnClick: false, // 编辑器内点击链接不跳转
                    },
                }),
                Placeholder.configure({ placeholder: params.placeholder || '' }),
                Markdown,
            ],
            content: params.value || '',
            contentType: 'markdown',
            editable: !params.disabled,
            onUpdate: () => this.handleUpdate(),
            onSelectionUpdate: () => this.triggerInputListeners(),
            onFocus: () => this.el.classList.add('focused'),
            onBlur: () => this.el.classList.remove('focused'),
            // 拦截 Base64 图片粘贴
            editorProps: {
                transformPastedHTML(html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const dataImageRegex = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;
                    doc.querySelectorAll('img').forEach((img) => {
                        if (dataImageRegex.test(img.src)) {
                            img.remove();
                        }
                    });
                    return doc.body.innerHTML;
                },
            },
        });

        // 保存引用以便清理
        this.keydownHandler = (e: KeyboardEvent) => {
            // Ctrl/Cmd + Enter 提交
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.params?.onsubmit();
            }
            // ESC 关闭 composer
            if (e.key === 'Escape') {
                e.preventDefault();
                this.params?.escape?.();
            }
        };
        this.el.addEventListener('keydown', this.keydownHandler);
    }

    private handleUpdate(): void {
        this.params?.oninput(this.getValue());
        this.triggerInputListeners();
    }

    private triggerInputListeners(): void {
        // 防抖：避免频繁触发
        if (this.inputListenerTimeout) {
            clearTimeout(this.inputListenerTimeout);
        }
        this.inputListenerTimeout = window.setTimeout(() => {
            this.inputListeners.forEach((fn) => { try { fn(); } catch (e) {} });
        }, 50);
    }

    getValue(): string {
        if (!this.editor) return '';
        // 官方 @tiptap/markdown V3 直接在 editor 实例上提供 getMarkdown()
        return this.editor.getMarkdown();
    }

    setValue(value: string): void {
        if (!this.editor) return;
        this.editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    }

    /**
     * Get the selected range of the editor.
     * @returns [from, to] ProseMirror positions
     */
    getSelectionRange(): Array<number> {
        if (!this.editor) return [0, 0];
        const { from, to } = this.editor.state.selection;
        return [from, to];
    }

    /**
     * Focus the editor and place the cursor at the given position.
     * @param position ProseMirror position
     */
    moveCursorTo(position: number): void {
        if (!this.editor) return;
        this.editor.commands.setTextSelection(position);
    }

    /**
     * Insert content into the editor at the position of the cursor.
     * @param text The text to insert
     * @param escape Whether to escape (insert as plain text)
     */
    insertAtCursor(text: string, escape: boolean = false): void {
        if (!this.editor) return;
        if (escape) {
            // insertText 自动作为纯文本插入
            const { from, to } = this.editor.state.selection;
            this.editor.view.dispatch(
                this.editor.state.tr.insertText(text, from, to)
            );
        } else {
            this.editor.commands.insertContent(text);
        }
    }

    /**
     * Insert content into the editor at the given position.
     * @param pos ProseMirror position
     * @param text The text to insert
     * @param escape Whether to escape (insert as plain text)
     */
    insertAt(pos: number, text: string, escape: boolean = false): void {
        this.insertBetween(pos, pos, text, escape);
    }

    /**
     * Insert content into the editor between the given positions.
     * If the start and end positions are different, any text between them will be overwritten.
     * @param start ProseMirror start position
     * @param end ProseMirror end position
     * @param text The text to insert
     * @param escape Whether to escape (insert as plain text)
     */
    insertBetween(start: number, end: number, text: string, escape: boolean = false): void {
        if (!this.editor) return;
        if (escape) {
            // insertText 自动作为纯文本插入，参考 askvortsov 方案
            this.editor.view.dispatch(
                this.editor.state.tr.insertText(text, start, end)
            );
        } else {
            // 需要解析内容时使用 insertContentAt
            this.editor
                .chain()
                .focus()
                .insertContentAt({ from: start, to: end }, text)
                .run();
        }
    }

    /**
     * Replace existing content from the start position to the current cursor position.
     * @param start ProseMirror start position
     * @param text The text to insert
     * @param escape Whether to escape (insert as plain text)
     */
    replaceBeforeCursor(start: number, text: string, escape: boolean = false): void {
        const [cursorPos] = this.getSelectionRange();
        this.insertBetween(start, cursorPos, text, escape);
    }

    /**
     * Get (at most) the last N characters from the current text node.
     * 只取当前节点内的文本，参考 askvortsov 方案
     * @param n Number of characters to retrieve
     */
    getLastNChars(n: number): string {
        if (!this.editor) return '';
        const { $from } = this.editor.state.selection;
        const nodeBefore = $from.nodeBefore;
        if (!nodeBefore || !nodeBefore.text) return '';
        return nodeBefore.text.slice(Math.max(0, nodeBefore.text.length - n));
    }

    /**
     * Get left and top coordinates of the caret relative to the editor viewport.
     * @param position ProseMirror position (optional, defaults to current selection)
     */
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

    /**
     * Focus on the editor.
     */
    focus(): void {
        this.editor?.commands.focus();
    }

    /**
     * Destroy the editor
     */
    destroy(): void {
        if (this.inputListenerTimeout) {
            clearTimeout(this.inputListenerTimeout);
        }
        // 移除 keydown 事件监听器
        if (this.keydownHandler) {
            this.el.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        this.editor?.destroy();
        this.editor = null;
        this.el?.parentNode?.removeChild(this.el);
    }

    /**
     * Set the disabled status of the editor.
     */
    disabled(isDisabled: boolean): void {
        this.editor?.setEditable(!isDisabled);
        this.el.classList.toggle('disabled', isDisabled);
    }

    // ========== WYSIWYG Formatting Commands (Tiptap-specific) ==========
    // 以下方法不是 EditorDriverInterface 的一部分，但供工具栏使用

    toggleBold(): void { this.editor?.chain().focus().toggleBold().run(); }
    toggleItalic(): void { this.editor?.chain().focus().toggleItalic().run(); }
    toggleUnderline(): void { this.editor?.chain().focus().toggleUnderline().run(); }
    toggleStrike(): void { this.editor?.chain().focus().toggleStrike().run(); }
    toggleCode(): void { this.editor?.chain().focus().toggleCode().run(); }
    toggleCodeBlock(): void { this.editor?.chain().focus().toggleCodeBlock().run(); }
    toggleBlockquote(): void { this.editor?.chain().focus().toggleBlockquote().run(); }
    toggleBulletList(): void { this.editor?.chain().focus().toggleBulletList().run(); }
    toggleOrderedList(): void { this.editor?.chain().focus().toggleOrderedList().run(); }
    setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void { this.editor?.chain().focus().toggleHeading({ level }).run(); }
    
    setLink(url: string): void {
        url ? this.editor?.chain().focus().setLink({ href: url }).run() 
            : this.editor?.chain().focus().unsetLink().run();
    }
    
    insertHorizontalRule(): void { this.editor?.chain().focus().setHorizontalRule().run(); }
    undo(): void { this.editor?.chain().focus().undo().run(); }
    redo(): void { this.editor?.chain().focus().redo().run(); }

    // State checks
    isActive(name: string, attrs?: Record<string, any>): boolean {
        return this.editor?.isActive(name, attrs) ?? false;
    }
    canUndo(): boolean { return this.editor?.can().undo() ?? false; }
    canRedo(): boolean { return this.editor?.can().redo() ?? false; }
}
