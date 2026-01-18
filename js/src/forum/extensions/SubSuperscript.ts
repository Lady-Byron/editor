import { Mark } from '@tiptap/core';

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

/**
 * Subscript Mark
 * Markdown 语法: ~text~ → <sub>text</sub>
 */
export const SubscriptMark = Mark.create({
    name: 'subscript',

    // 高优先级确保在 Markdown 序列化时角标在内层
    // Bold/Italic 默认优先级是 1000，设为 1100 让角标在内层
    // 例如输出 **~text~** 而不是 ~**text**~
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
            // 优先匹配 ~(text) 格式（支持空格）
            const matchParen = /^~\(([^)]+)\)/.exec(src);
            if (matchParen) {
                return {
                    type: 'subscript',
                    raw: matchParen[0],
                    text: matchParen[1],
                    tokens: lexer.inlineTokens(matchParen[1]),
                };
            }
            // 回退到 ~text~ 格式（不支持空格）
            const match = /^~([^~\s]+)~(?!~)/.exec(src);
            if (!match) return undefined;
            return {
                type: 'subscript',
                raw: match[0],
                text: match[1],
                tokens: lexer.inlineTokens(match[1]),
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('subscript', content);
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        // 始终使用 ~(content) 格式，因为 Flarum 的 ~text~ 不支持空格
        return `~(${content})`;
    },
});

/**
 * Superscript Mark
 * Markdown 语法: ^text^ → <sup>text</sup>
 */
export const SuperscriptMark = Mark.create({
    name: 'superscript',

    // 高优先级确保在 Markdown 序列化时角标在内层
    // Bold/Italic 默认优先级是 1000，设为 1100 让角标在内层
    // 例如输出 **^text^** 而不是 ^**text**^
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
            // 优先匹配 ^(text) 格式（支持空格）
            const matchParen = /^\^\(([^)]+)\)/.exec(src);
            if (matchParen) {
                return {
                    type: 'superscript',
                    raw: matchParen[0],
                    text: matchParen[1],
                    tokens: lexer.inlineTokens(matchParen[1]),
                };
            }
            // 回退到 ^text^ 格式（不支持空格）
            const match = /^\^([^\^\s]+)\^/.exec(src);
            if (!match) return undefined;
            return {
                type: 'superscript',
                raw: match[0],
                text: match[1],
                tokens: lexer.inlineTokens(match[1]),
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('superscript', content);
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        // 始终使用 ^(content) 格式，因为 Flarum 的 ^text^ 不支持空格
        return `^(${content})`;
    },
});
