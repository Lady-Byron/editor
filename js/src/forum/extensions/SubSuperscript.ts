import { Mark } from '@tiptap/core';
import { getLbInlineTokens } from './markedHelper';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        subscript: {
            setSubscript: () => ReturnType;
            toggleSubscript: () => ReturnType;
            unsetSubscript: () => ReturnType;
        };
        superscript: {
            setSuperscript: () => ReturnType;
            toggleSuperscript: () => ReturnType;
            unsetSuperscript: () => ReturnType;
        };
    }
}

export const SubscriptMark = Mark.create({
    name: 'subscript',

    priority: 1100,

    excludes: 'superscript',

    parseHTML() {
        return [{ tag: 'sub' }];
    },

    renderHTML() {
        return ['sub', 0];
    },

    addCommands() {
        return {
            setSubscript: () => ({ commands }) => {
                return commands.setMark(this.name);
            },
            toggleSubscript: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            },
            unsetSubscript: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-,': () => this.editor.commands.toggleSubscript(),
        };
    },

    markdownTokenName: 'subscript',

    markdownTokenizer: {
        name: 'subscript',
        level: 'inline',
        start: (src: string) => src.indexOf('~'),
        tokenize: (src: string, tokens: any[], lexer: any) => {
            const matchParen = /^~\(([^)]+)\)/.exec(src);
            if (matchParen) {
                return {
                    type: 'subscript',
                    raw: matchParen[0],
                    text: matchParen[1],
                    tokens: getLbInlineTokens(matchParen[1]),
                };
            }
            const match = /^~([^~\s]+)~(?!~)/.exec(src);
            if (!match) return undefined;
            return {
                type: 'subscript',
                raw: match[0],
                text: match[1],
                tokens: getLbInlineTokens(match[1]),
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('subscript', content);
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        return `~(${content})`;
    },
});

export const SuperscriptMark = Mark.create({
    name: 'superscript',

    priority: 1100,

    excludes: 'subscript',

    parseHTML() {
        return [{ tag: 'sup' }];
    },

    renderHTML() {
        return ['sup', 0];
    },

    addCommands() {
        return {
            setSuperscript: () => ({ commands }) => {
                return commands.setMark(this.name);
            },
            toggleSuperscript: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            },
            unsetSuperscript: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-.': () => this.editor.commands.toggleSuperscript(),
        };
    },

    markdownTokenName: 'superscript',

    markdownTokenizer: {
        name: 'superscript',
        level: 'inline',
        start: (src: string) => src.indexOf('^'),
        tokenize: (src: string, tokens: any[], lexer: any) => {
            const matchParen = /^\^\(([^)]+)\)/.exec(src);
            if (matchParen) {
                return {
                    type: 'superscript',
                    raw: matchParen[0],
                    text: matchParen[1],
                    tokens: getLbInlineTokens(matchParen[1]),
                };
            }
            const match = /^\^([^\^\s]+)\^/.exec(src);
            if (!match) return undefined;
            return {
                type: 'superscript',
                raw: match[0],
                text: match[1],
                tokens: getLbInlineTokens(match[1]),
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('superscript', content);
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        return `^(${content})`;
    },
});
