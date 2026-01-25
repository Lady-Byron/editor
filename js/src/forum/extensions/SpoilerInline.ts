import { Mark, mergeAttributes } from '@tiptap/core';

export interface SpoilerInlineOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        spoilerInline: {
            setSpoilerInline: () => ReturnType;
            toggleSpoilerInline: () => ReturnType;
            unsetSpoilerInline: () => ReturnType;
        };
    }
}

export const SpoilerInline = Mark.create<SpoilerInlineOptions>({
    name: 'spoilerInline',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'spoiler-inline',
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'span.spoiler-inline' },
            { tag: 'span.spoiler_inline' },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setSpoilerInline: () => ({ commands }) => {
                return commands.setMark(this.name);
            },
            toggleSpoilerInline: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            },
            unsetSpoilerInline: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-s': () => this.editor.commands.toggleSpoilerInline(),
        };
    },

    markdownTokenName: 'spoiler_inline',

    markdownTokenizer: {
        name: 'spoiler_inline',
        level: 'inline',
        start: (src: string) => {
            const idx1 = src.indexOf('>!');
            const idx2 = src.indexOf('||');
            if (idx1 === -1) return idx2;
            if (idx2 === -1) return idx1;
            return Math.min(idx1, idx2);
        },
        tokenize: (src: string) => {
            // 不需要 lexer 参数，不调用 lexer.inlineTokens()
            const match1 = /^>!([^!]+)!</.exec(src);
            if (match1) {
                return {
                    type: 'spoiler_inline',
                    raw: match1[0],
                    text: match1[1],
                    // 不在这里调用 lexer.inlineTokens()，让 parseMarkdown 处理
                };
            }
            const match2 = /^\|\|([^|]+)\|\|/.exec(src);
            if (match2) {
                return {
                    type: 'spoiler_inline',
                    raw: match2[0],
                    text: match2[1],
                };
            }
            return undefined;
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        // 用 helpers.parseInline 处理嵌套内容
        const content = helpers.parseInline(token.text);
        return helpers.applyMark('spoilerInline', content);
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        return `>!${content}!<`;
    },
});

export default SpoilerInline;
