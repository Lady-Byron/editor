import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
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
                Markdown,
                TaskList,
                TaskItem.configure({ nested: true }),
            ],
            content: params.value || '<p></p>',
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
        this.editor?.destroy();
        this.editor = null;
        this.el?.parentNode?.removeChild(this.el);
    }

    disabled(isDisabled: boolean): void {
        this.editor?.setEditable(!isDisabled);
        this.el.classList.toggle('disabled', isDisabled);
    }
}
