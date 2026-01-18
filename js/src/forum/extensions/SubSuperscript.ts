import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

/**
 * 扩展 Subscript 添加 Markdown 支持
 * 语法: ~text~ → <sub>text</sub>
 */
export const SubscriptWithMarkdown = Subscript.extend({
    // Markdown tokenizer: 识别 ~text~
    markdownTokenizer: {
        name: 'subscript',
        level: 'inline',
        start: (src: string) => src.indexOf('~'),
        tokenize: (src: string) => {
            // 匹配 ~text~ (非贪婪，且不匹配 ~~删除线~~)
            const match = /^~([^~]+)~(?!~)/.exec(src);
            if (!match) return undefined;
            return {
                type: 'subscript',
                raw: match[0],
                text: match[1],
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        return helpers.applyMark('subscript', [
            { type: 'text', text: token.text }
        ]);
    },

    // Tiptap JSON → Markdown
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        return `~${content}~`;
    },
});

/**
 * 扩展 Superscript 添加 Markdown 支持
 * 语法: ^text^ → <sup>text</sup>
 */
export const SuperscriptWithMarkdown = Superscript.extend({
    // Markdown tokenizer: 识别 ^text^
    markdownTokenizer: {
        name: 'superscript',
        level: 'inline',
        start: (src: string) => src.indexOf('^'),
        tokenize: (src: string) => {
            // 匹配 ^text^
            const match = /^\^([^\^]+)\^/.exec(src);
            if (!match) return undefined;
            return {
                type: 'superscript',
                raw: match[0],
                text: match[1],
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        return helpers.applyMark('superscript', [
            { type: 'text', text: token.text }
        ]);
    },

    // Tiptap JSON → Markdown
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        return `^${content}^`;
    },
});
