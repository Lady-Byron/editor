import { Mark, mergeAttributes } from '@tiptap/core';

export interface SubscriptOptions {
    HTMLAttributes: Record<string, any>;
}

export interface SuperscriptOptions {
    HTMLAttributes: Record<string, any>;
}

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
 * 语法: ~text~ → <sub>text</sub>
 */
export const SubscriptMark = Mark.create<SubscriptOptions>({
    name: 'subscript',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    // 与 superscript 互斥
    excludes: 'superscript',

    parseHTML() {
        return [{ tag: 'sub' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['sub', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
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
                // 解析内部的 inline 内容（支持嵌套加粗/斜体等）
                tokens: lexer?.inlineTokens(match[1]) || [],
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        // 使用 parseInline 处理嵌套内容
        const content = token.tokens?.length 
            ? helpers.parseInline(token.tokens)
            : [{ type: 'text', text: token.text }];
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
 * 语法: ^text^ → <sup>text</sup>
 */
export const SuperscriptMark = Mark.create<SuperscriptOptions>({
    name: 'superscript',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    // 与 subscript 互斥
    excludes: 'subscript',

    parseHTML() {
        return [{ tag: 'sup' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['sup', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
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
                // 解析内部的 inline 内容（支持嵌套加粗/斜体等）
                tokens: lexer?.inlineTokens(match[1]) || [],
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        // 使用 parseInline 处理嵌套内容
        const content = token.tokens?.length 
            ? helpers.parseInline(token.tokens)
            : [{ type: 'text', text: token.text }];
        return helpers.applyMark('superscript', content);
    },

    // Tiptap JSON → Markdown
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node.content || []);
        return `^${content}^`;
    },
});
