import type { Editor } from '@tiptap/core';
import type Mithril from 'mithril';

declare const m: Mithril.Static;

export default class MenuState {
    editor: Editor | null = null;
    private boundUpdate: (() => void) | null = null;
    private redrawTimeout: number | null = null;

    attachEditor(editor: Editor): void {
        this.editor = editor;
        this.boundUpdate = () => {
            if (this.redrawTimeout) clearTimeout(this.redrawTimeout);
            this.redrawTimeout = window.setTimeout(() => m.redraw(), 16);
        };
        editor.on('selectionUpdate', this.boundUpdate);
        editor.on('update', this.boundUpdate);
    }

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

    // 状态检查
    isActive(name: string, attrs?: Record<string, any>): boolean {
        return this.editor?.isActive(name, attrs) ?? false;
    }

    canUndo(): boolean {
        return this.editor?.can().undo() ?? false;
    }

    canRedo(): boolean {
        return this.editor?.can().redo() ?? false;
    }

    selectionEmpty(): boolean {
        if (!this.editor) return true;
        const { from, to } = this.editor.state.selection;
        return from === to;
    }

    getSelectedText(): string {
        if (!this.editor) return '';
        const { from, to } = this.editor.state.selection;
        return this.editor.state.doc.textBetween(from, to, ' ');
    }

    getLinkAttributes(): { href: string; title: string } {
        if (!this.editor) return { href: '', title: '' };
        const attrs = this.editor.getAttributes('link');
        return { href: attrs.href || '', title: attrs.title || '' };
    }

    // 命令执行
    toggleBold(): void { this.runCommand(() => this.editor?.chain().focus().toggleBold().run()); }
    toggleItalic(): void { this.runCommand(() => this.editor?.chain().focus().toggleItalic().run()); }
    toggleStrike(): void { this.runCommand(() => this.editor?.chain().focus().toggleStrike().run()); }
    toggleCode(): void { this.runCommand(() => this.editor?.chain().focus().toggleCode().run()); }
    toggleCodeBlock(): void { this.runCommand(() => this.editor?.chain().focus().toggleCodeBlock().run()); }
    toggleBlockquote(): void { this.runCommand(() => this.editor?.chain().focus().toggleBlockquote().run()); }
    toggleBulletList(): void { this.runCommand(() => this.editor?.chain().focus().toggleBulletList().run()); }
    toggleOrderedList(): void { this.runCommand(() => this.editor?.chain().focus().toggleOrderedList().run()); }
    toggleTaskList(): void { this.runCommand(() => this.editor?.chain().focus().toggleTaskList().run()); }

    setHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
        this.runCommand(() => this.editor?.chain().focus().toggleHeading({ level }).run());
    }

    setParagraph(): void {
        this.runCommand(() => this.editor?.chain().focus().setParagraph().run());
    }

    setLink(href: string, title?: string): void {
        this.runCommand(() => {
            if (href) {
                const attrs: { href: string; title?: string } = { href };
                if (title) attrs.title = title;
                this.editor?.chain().focus().setLink(attrs).run();
            } else {
                this.editor?.chain().focus().unsetLink().run();
            }
        });
    }

    insertLinkWithText(text: string, href: string, title?: string): void {
        this.runCommand(() => {
            if (!this.editor) return;
            const attrs: { href: string; title?: string } = { href };
            if (title) attrs.title = title;
            this.editor
                .chain()
                .focus()
                .insertContent({
                    type: 'text',
                    text: text,
                    marks: [{ type: 'link', attrs }],
                })
                .run();
        });
    }

    insertHorizontalRule(): void {
        this.runCommand(() => this.editor?.chain().focus().setHorizontalRule().run());
    }

    undo(): void { this.runCommand(() => this.editor?.chain().focus().undo().run()); }
    redo(): void { this.runCommand(() => this.editor?.chain().focus().redo().run()); }

    // 安全执行命令，确保编辑器已聚焦
    private runCommand(command: () => void): void {
        if (!this.editor) return;

        if (!this.editor.isFocused) {
            this.editor.commands.focus();
        }

        command();
    }
}
