import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';

export interface EditorParams {
    classNames: string[];
    disabled: boolean;
    placeholder: string;
    value: string;
    inputListeners: Array<() => void>;
    oninput: (value: string) => void;
    onsubmit: () => void;
}

/**
 * TiptapEditorDriver - Implements Flarum's EditorDriverInterface
 */
export default class TiptapEditorDriver {
    el!: HTMLElement;
    editor: Editor | null = null;
    private params: EditorParams | null = null;
    private inputListeners: Array<() => void> = [];
    private inputListenerTimeout: number | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

    /**
     * Build the editor instance
     */
    build(dom: HTMLElement, params: EditorParams): void {
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
                Image.configure({ inline: true, allowBase64: true }),
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

    getSelectionRange(): [number, number] {
        if (!this.editor) return [0, 0];
        const { from, to } = this.editor.state.selection;
        // ProseMirror 位置包含文档结构，需转换为纯文本偏移
        // from/to 最小为1（文档开始），转换为0-based索引
        return [Math.max(0, from - 1), Math.max(0, to - 1)];
    }

    moveCursorTo(position: number): void {
        if (!this.editor) return;
        // 转换0-based索引回 ProseMirror 位置
        const docSize = this.editor.state.doc.content.size;
        const pos = Math.min(Math.max(1, position + 1), docSize);
        this.editor.commands.setTextSelection(pos);
    }

    insertAtCursor(text: string): void {
        this.editor?.commands.insertContent(text);
    }

    replaceBeforeCursor(start: number, text: string): void {
        if (!this.editor) return;
        const { from } = this.editor.state.selection;
        const deleteFrom = Math.max(1, from - start);
        this.editor.chain().deleteRange({ from: deleteFrom, to: from }).insertContent(text).run();
    }

    getLastNChars(n: number): string {
        if (!this.editor) return '';
        const { from } = this.editor.state.selection;
        // textBetween 的位置参数，确保不越界
        const start = Math.max(0, from - n);
        return this.editor.state.doc.textBetween(start, from, '');
    }

    getCaretCoordinates(): { top: number; left: number } {
        if (!this.editor?.view) return { top: 0, left: 0 };
        const coords = this.editor.view.coordsAtPos(this.editor.state.selection.from);
        // 返回相对于编辑器容器的坐标，供 mentions/emoji 下拉定位使用
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

    disabled(isDisabled: boolean): void {
        this.editor?.setEditable(!isDisabled);
        this.el.classList.toggle('disabled', isDisabled);
    }

    // Formatting commands
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
