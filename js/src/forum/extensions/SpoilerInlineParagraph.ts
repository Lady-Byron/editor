import { Node } from '@tiptap/core';

export const SpoilerInlineParagraph = Node.create({
    name: 'spoilerInlineParagraph',

    markdownTokenName: 'spoiler_inline_paragraph',

    // 基础 tokenizer - 会被 TiptapEditorDriver 中的 patch 替换
    markdownTokenizer: {
        name: 'spoiler_inline_paragraph',
        level: 'block',
        start: (src: string) => {
            const match = /^>![^\s]/.exec(src);
            return match ? 0 : -1;
        },
        tokenize: (src: string) => {
            const lineMatch = /^(.*?)(?:\n|$)/.exec(src);
            if (!lineMatch) return undefined;

            const raw = lineMatch[0];
            const line = raw.replace(/\n$/, '');

            // 排除 block spoiler（">! " 开头）
            if (/^>! /.test(line)) return undefined;

            // 必须包含 spoiler 语法
            if (!/^>![^!]+!</.test(line) && !/\|\|[^|]+\|\|/.test(line)) return undefined;

            return {
                type: 'spoiler_inline_paragraph',
                raw,
                tokens: [],
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return {
            type: 'paragraph',
            content: content.length ? content : undefined,
        };
    },
});

export default SpoilerInlineParagraph;
