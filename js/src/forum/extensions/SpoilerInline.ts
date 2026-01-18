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
        tokenize: (src: string, tokens: any[]) => {
            // 优先匹配 >!text!< (非贪婪，不跨越 !< 边界)
            const match1 = /^>!([^!]+)!</.exec(src);
            if (match1) {
                return {
                    type: 'spoiler_inline',
                    raw: match1[0],
                    text: match1[1],
                };
            }
            // 兼容 ||text|| (非贪婪，不跨越 || 边界)
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

    // Token → Tiptap JSON (V3 API)
    parseMarkdown: (token: any, helpers: any) => {
        // 直接创建带有 spoilerInline mark 的文本节点
        return helpers.applyMark('spoilerInline', [
            { type: 'text', text: token.text }
        ]);
    },

    // Tiptap JSON → Markdown (统一输出 >!text!< 格式)
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        return `>!${content}!<`;
    },
});

export default SpoilerInline;
