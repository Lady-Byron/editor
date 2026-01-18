import { Mark, mergeAttributes } from '@tiptap/core';

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
 * 官方示例: https://tiptap.dev/docs/editor/markdown/examples
 */
export const SubscriptMark = Mark.create({
    name: 'subscript',

    // 与 superscript 互斥
    excludes: 'superscript',

    parseHTML() {
        return [{ tag: 'sub' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['sub', mergeAttributes(HTMLAttributes), 0];
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

    // Markdown token 名称
    markdownTokenName: 'subscript',

    // Markdown tokenizer: 识别 ~text~
    markdownTokenizer: {
        name: 'subscript',
        level: 'inline',
        start: (src: string) => src.indexOf('~'),
        tokenize: (src: string, tokens: any[], lexer: any) => {
            // 匹配 ~text~ (非贪婪，且不匹配 ~~删除线~~)
            const match = /^~([^~]+)~(?!~)/.exec(src);
            if (!match) return undefined;
            return {
                type: 'subscript',
                raw: match[0],
                text: match[1],
                tokens: lexer.inlineTokens(match[1]),
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('subscript', content);
    },

    // Tiptap JSON → Markdown
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node.content || []);
        return `~${content}~`;
    },
});

/**
 * Superscript Mark
 * Markdown 语法: ^text^ → <sup>text</sup>
 * 官方示例: https://tiptap.dev/docs/editor/markdown/examples
 */
export const SuperscriptMark = Mark.create({
    name: 'superscript',

    // 与 subscript 互斥
    excludes: 'subscript',

    parseHTML() {
        return [{ tag: 'sup' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['sup', mergeAttributes(HTMLAttributes), 0];
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

    // Markdown token 名称
    markdownTokenName: 'superscript',

    // Markdown tokenizer: 识别 ^text^
    markdownTokenizer: {
        name: 'superscript',
        level: 'inline',
        start: (src: string) => src.indexOf('^'),
        tokenize: (src: string, tokens: any[], lexer: any) => {
            // 匹配 ^text^
            const match = /^\^([^\^]+)\^/.exec(src);
            if (!match) return undefined;
            return {
                type: 'superscript',
                raw: match[0],
                text: match[1],
                tokens: lexer.inlineTokens(match[1]),
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('superscript', content);
    },

    // Tiptap JSON → Markdown
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node.content || []);
        return `^${content}^`;
    },
});
