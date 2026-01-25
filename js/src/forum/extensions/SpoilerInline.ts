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
            { tag: 'span.spoiler_inline' },  // 兼容 Flarum 原有类名
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

    // Markdown token 名称（与 tokenizer.name 对应）
    markdownTokenName: 'spoiler_inline',

    // Markdown tokenizer: 识别 >!text!< 和 ||text||
    // 注意：行首的 >!text!< 由 SpoilerInlineParagraph 块级扩展优先处理
    // Block tokenizer 优先级更高，如果到达这里说明 block 已决定不处理
    markdownTokenizer: {
        name: 'spoiler_inline',
        level: 'inline',
        start: (src: string) => {
            // 简单返回两种语法的最早出现位置
            // tokenize() 的正则会过滤掉不合法的模式（如 ">! " 带空格）
            const idx1 = src.indexOf('>!');
            const idx2 = src.indexOf('||');
            
            if (idx1 === -1) return idx2;
            if (idx2 === -1) return idx1;
            return Math.min(idx1, idx2);
        },
        tokenize: (src: string, tokens: any[], lexer: any) => {
            // 匹配 >!text!< (非贪婪)
            const match1 = /^>!([^!]+)!</.exec(src);
            if (match1) {
                return {
                    type: 'spoiler_inline',
                    raw: match1[0],
                    text: match1[1],
                    tokens: lexer.inlineTokens(match1[1]), // 解析嵌套的行内格式
                };
            }
            // 兼容 ||text|| (非贪婪)
            const match2 = /^\|\|([^|]+)\|\|/.exec(src);
            if (match2) {
                return {
                    type: 'spoiler_inline',
                    raw: match2[0],
                    text: match2[1],
                    tokens: lexer.inlineTokens(match2[1]), // 解析嵌套的行内格式
                };
            }
            return undefined;
        },
    },

    // Token → Tiptap JSON (V3 API)
    parseMarkdown: (token: any, helpers: any) => {
        // 解析嵌套的行内格式，然后应用 spoilerInline mark
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('spoilerInline', content);
    },

    // Tiptap JSON → Markdown (统一输出 >!text!< 格式)
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node.content || []);
        return `>!${content}!<`;
    },
});

export default SpoilerInline;
