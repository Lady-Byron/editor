import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { EditorDriverParams } from 'flarum/common/utils/EditorDriverInterface';

/**
 * TiptapEditorDriver - Implements Flarum's EditorDriverInterface
 * 完整实现 Flarum 编辑器驱动接口，确保与 mentions/emoji/upload 等插件兼容
 */
export default class TiptapEditorDriver implements EditorDriverInterface {
    el!: HTMLElement;
    editor: Editor | null = null;
    private params: EditorDriverParams | null = null;
    private inputListeners: Function[] = [];
    private inputListenerTimeout: number | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    /**
     * Build the editor instance
     */
    build(dom: HTMLElement, params: EditorDriverParams): void {
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
                        openOnClick: false,
                        defaultProtocol: 'https',
                    },
                }),
                // 移除 allowBase64: true，避免帖子体积爆炸
                // 图片应该通过 Flarum 的上传系统处理
                Image.configure({ inline: true }),
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
        });

        // 保存引用以便清理
        this.keydownHandler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.params?.onsubmit();
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

    /**
     * 转义 Markdown 特殊字符
     * 当 escape=true 时，插入的文本不会被解析为 Markdown
     */
    private escapeMarkdown(text: string): string {
        return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
    }

    /**
     * 将 0-based 文本位置转换为 ProseMirror 位置
     * ProseMirror 位置从 1 开始，并包含文档结构
     */
    private textPosToPmPos(textPos: number): number {
        if (!this.editor) return 1;
        const docSize = this.editor.state.doc.content.size;
        return Math.min(Math.max(1, textPos + 1), docSize);
    }

    /**
     * 将 ProseMirror 位置转换为 0-based 文本位置
     */
    private pmPosToTextPos(pmPos: number): number {
        return Math.max(0, pmPos - 1);
    }

    getValue(): string {
        if (!this.editor) return '';
        // 官方 @tiptap/markdown V3 直接在 editor 实例上提供 getMarkdown()
        return this.editor.getMarkdown();
    }

    setValue(value: string): void {
        if (this.editor && this.getValue() !== value) {
            this.editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
        }
    }

    /**
     * Get the selected range of the editor.
     * @returns [start, end] 0-based text positions
     */
    getSelectionRange(): Array<number> {
        if (!this.editor) return [0, 0];
        const { from, to } = this.editor.state.selection;
        return [this.pmPosToTextPos(from), this.pmPosToTextPos(to)];
    }

    /**
     * Focus the editor and place the cursor at the given position.
     * @param position 0-based text position
     */
    moveCursorTo(position: number): void {
        if (!this.editor) return;
        const pos = this.textPosToPmPos(position);
        this.editor.commands.setTextSelection(pos);
    }

    /**
     * Insert content into the editor at the position of the cursor.
     * @param text The text to insert
     * @param escape Whether to escape Markdown special characters
     */
    insertAtCursor(text: string, escape: boolean = false): void {
        if (!this.editor) return;
        const content = escape ? this.escapeMarkdown(text) : text;
        this.editor.commands.insertContent(content);
    }

    /**
     * Insert content into the editor at the given position.
     * @param pos 0-based text position
     * @param text The text to insert
     * @param escape Whether to escape Markdown special characters
     */
    insertAt(pos: number, text: string, escape: boolean = false): void {
        if (!this.editor) return;
        const content = escape ? this.escapeMarkdown(text) : text;
        const pmPos = this.textPosToPmPos(pos);
        this.editor.chain()
            .setTextSelection(pmPos)
            .insertContent(content)
            .run();
    }

    /**
     * Insert content into the editor between the given positions.
     * If the start and end positions are different, any text between them will be overwritten.
     * @param start 0-based start position
     * @param end 0-based end position
     * @param text The text to insert
     * @param escape Whether to escape Markdown special characters
     */
    insertBetween(start: number, end: number, text: string, escape: boolean = false): void {
        if (!this.editor) return;
        const content = escape ? this.escapeMarkdown(text) : text;
        const pmStart = this.textPosToPmPos(start);
        const pmEnd = this.textPosToPmPos(end);
        this.editor.chain()
            .deleteRange({ from: pmStart, to: pmEnd })
            .insertContent(content)
            .run();
    }

    /**
     * Replace existing content from the start to the current cursor position.
     * @param start Number of characters before cursor to replace
     * @param text The text to insert
     * @param escape Whether to escape Markdown special characters
     */
    replaceBeforeCursor(start: number, text: string, escape: boolean = false): void {
        if (!this.editor) return;
        const content = escape ? this.escapeMarkdown(text) : text;
        const { from } = this.editor.state.selection;
        const deleteFrom = Math.max(1, from - start);
        this.editor.chain()
            .deleteRange({ from: deleteFrom, to: from })
            .insertContent(content)
            .run();
    }

    /**
     * Get the last N characters from the current "text block".
     * @param n Number of characters to retrieve
     */
    getLastNChars(n: number): string {
        if (!this.editor) return '';
        const { from } = this.editor.state.selection;
        // textBetween 的位置参数，确保不越界
        const start = Math.max(1, from - n);
        return this.editor.state.doc.textBetween(start, from, '');
    }

    /**
     * Get left and top coordinates of the caret relative to the editor viewport.
     * @param position 0-based text position (optional, defaults to current selection)
     */
    getCaretCoordinates(position?: number): { left: number; top: number } {
        if (!this.editor?.view) return { top: 0, left: 0 };
        
        // 如果提供了 position 参数，使用它；否则使用当前选区位置
        const pmPos = position !== undefined 
            ? this.textPosToPmPos(position) 
            : this.editor.state.selection.from;
        
        const coords = this.editor.view.coordsAtPos(pmPos);
        // 返回相对于编辑器容器的坐标，供 mentions/emoji 下拉定位使用
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
    
    insertImage(src: string, alt?: string): void {
        this.editor?.chain().focus().setImage({ src, alt: alt || '' }).run();
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
