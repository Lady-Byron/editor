import { Mark, mergeAttributes } from '@tiptap/core';
import { getLbInlineTokens } from './markedHelper';

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
        tokenize: (src: string, tokens: any[], lexer: any) => {
            const match1 = /^>!([^!]+)!</.exec(src);
            if (match1) {
                return {
                    type: 'spoiler_inline',
                    raw: match1[0],
                    text: match1[1],
                    tokens: getLbInlineTokens(match1[1]),
                };
            }
            const match2 = /^\|\|([^|]+)\|\|/.exec(src);
            if (match2) {
                return {
                    type: 'spoiler_inline',
                    raw: match2[0],
                    text: match2[1],
                    tokens: getLbInlineTokens(match2[1]),
                };
            }
            return undefined;
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('spoilerInline', content);
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node.content || []);
        return `>!${content}!<`;
    },
});

export default SpoilerInline;
