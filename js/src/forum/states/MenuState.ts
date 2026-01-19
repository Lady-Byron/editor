import type { Editor } from '@tiptap/core';
import type Mithril from 'mithril';

declare const m: Mithril.Static;

export default class MenuState {
    editor: Editor | null = null;
    private boundUpdate: (() => void) | null = null;
    private redrawTimeout: number | null = null;

    // 预绑定的事件处理器，避免每次 render 创建新函数
    public readonly handleUndoClick = (e: Event): void => {
        e.preventDefault();
        this.undo();
    };

    public readonly handleRedoClick = (e: Event): void => {
        e.preventDefault();
        this.redo();
    };

    public readonly handleBlankLineClick = (e: Event): void => {
        e.preventDefault();
        this.insertBlankLine();
    };

    public readonly handleIndentClick = (e: Event): void => {
        e.preventDefault();
        this.insertIndent(2);
    };

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

    // Spoiler 命令
    toggleSpoilerInline(): void {
        this.runCommand(() => this.editor?.chain().focus().toggleSpoilerInline().run());
    }

    toggleSpoilerBlock(): void {
        this.runCommand(() => this.editor?.chain().focus().toggleSpoilerBlock().run());
    }

    toggleSubscript(): void {
        this.runCommand(() => this.editor?.chain().focus().toggleSubscript().run());
    }

    toggleSuperscript(): void {
        this.runCommand(() => this.editor?.chain().focus().toggleSuperscript().run());
    }

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

    // BBCode 命令 - 空白行和缩进
    insertBlankLine(): void {
        this.runCommand(() => this.editor?.chain().focus().insertBlankLine().run());
    }

    insertIndent(count: number = 2): void {
        this.runCommand(() => this.editor?.chain().focus().insertIndent(count).run());
    }

    // 表格命令
    isInTable(): boolean {
        return this.editor?.isActive('table') ?? false;
    }

    insertTable(rows: number = 3, cols: number = 3, withHeaderRow: boolean = true): void {
        const safeCols = Math.max(2, cols);
        const safeRows = Math.max(1, rows);
        this.runCommand(() => this.editor?.chain().focus().insertTable({ rows: safeRows, cols: safeCols, withHeaderRow }).run());
    }

    deleteTable(): void {
        this.runCommand(() => this.editor?.chain().focus().deleteTable().run());
    }

    addRowBefore(): void {
        this.runCommand(() => this.editor?.chain().focus().addRowBefore().run());
    }

    addRowAfter(): void {
        this.runCommand(() => this.editor?.chain().focus().addRowAfter().run());
    }

    deleteRow(): void {
        this.runCommand(() => this.editor?.chain().focus().deleteRow().run());
    }

    addColumnBefore(): void {
        this.runCommand(() => this.editor?.chain().focus().addColumnBefore().run());
    }

    addColumnAfter(): void {
        this.runCommand(() => this.editor?.chain().focus().addColumnAfter().run());
    }

    deleteColumn(): void {
        if (!this.editor) return;
        const colCount = this.getTableColumnCount();
        if (colCount !== null && colCount <= 2) {
            return;
        }
        this.runCommand(() => this.editor?.chain().focus().deleteColumn().run());
    }

    private getTableColumnCount(): number | null {
        if (!this.editor) return null;
        const { state } = this.editor;
        const { $from } = state.selection;
        
        for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === 'table') {
                const firstChild = node.firstChild;
                if (!firstChild) return null;
                
                const firstRow = firstChild.type.name === 'tableRow' 
                    ? firstChild 
                    : firstChild.firstChild;
                    
                return firstRow?.childCount ?? null;
            }
        }
        return null;
    }

    undo(): void { this.runCommand(() => this.editor?.chain().focus().undo().run()); }
    redo(): void { this.runCommand(() => this.editor?.chain().focus().redo().run()); }

    private runCommand(command: () => void): void {
        if (!this.editor) return;

        if (!this.editor.isFocused) {
            this.editor.commands.focus();
        }

        command();
    }
}
