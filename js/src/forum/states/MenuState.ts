import type { Editor } from '@tiptap/core';
import type Mithril from 'mithril';

// Mithril 全局变量
declare const m: Mithril.Static;

/**
 * MenuState - 工具栏状态管理类
 * 参考 askvortsov1/flarum-rich-text 的 MenuState 实现
 * 解耦工具栏与编辑器驱动，提供统一的状态查询和命令执行接口
 */
export default class MenuState {
    editor: Editor | null = null;
    private boundUpdate: (() => void) | null = null;
    private redrawTimeout: number | null = null;

    /**
     * 连接编辑器实例
     */
    attachEditor(editor: Editor): void {
        this.editor = editor;
        this.boundUpdate = () => {
            // 16ms 防抖：约一帧时间，减少快速输入时的重绘次数
            if (this.redrawTimeout) {
                clearTimeout(this.redrawTimeout);
            }
            this.redrawTimeout = window.setTimeout(() => m.redraw(), 16);
        };
        editor.on('selectionUpdate', this.boundUpdate);
        editor.on('update', this.boundUpdate);
    }

    /**
     * 销毁状态，清理事件监听和定时器
     */
    destroy(): void {
        if (this.redrawTimeout) {
            clearTimeout(this.redrawTimeout);
            this.redrawTimeout = null;
        }
        if (this.editor && this.boundUpdate) {
            this.editor.off('selectionUpdate', this.boundUpdate);
            this.editor.off('update', this.boundUpdate);
        }
        this.boundUpdate = null;
        this.editor = null;
    }

    // ========== 状态检查方法 ==========

    isActive(name: string, attrs?: Record<string, any>): boolean {
        return this.editor?.isActive(name, attrs) ?? false;
    }

    canUndo(): boolean {
        return this.editor?.can().undo() ?? false;
    }

    canRedo(): boolean {
        return this.editor?.can().redo() ?? false;
    }

    // ========== 命令执行方法 ==========

    toggleBold(): void { this.editor?.chain().focus().toggleBold().run(); }
    toggleItalic(): void { this.editor?.chain().focus().toggleItalic().run(); }
    toggleStrike(): void { this.editor?.chain().focus().toggleStrike().run(); }
    toggleCode(): void { this.editor?.chain().focus().toggleCode().run(); }
    toggleCodeBlock(): void { this.editor?.chain().focus().toggleCodeBlock().run(); }
    toggleBlockquote(): void { this.editor?.chain().focus().toggleBlockquote().run(); }
    toggleBulletList(): void { this.editor?.chain().focus().toggleBulletList().run(); }
    toggleOrderedList(): void { this.editor?.chain().focus().toggleOrderedList().run(); }
    
    setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
        this.editor?.chain().focus().toggleHeading({ level }).run();
    }
    
    setParagraph(): void {
        this.editor?.chain().focus().setParagraph().run();
    }
    
    setLink(url: string): void {
        url ? this.editor?.chain().focus().setLink({ href: url }).run()
            : this.editor?.chain().focus().unsetLink().run();
    }
    
    insertHorizontalRule(): void {
        this.editor?.chain().focus().setHorizontalRule().run();
    }
    
    undo(): void { this.editor?.chain().focus().undo().run(); }
    redo(): void { this.editor?.chain().focus().redo().run(); }
}
