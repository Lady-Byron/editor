import { Mark, mergeAttributes } from '@tiptap/core';

export interface TextSizeOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textSize: {
            setTextSize: (size: number) => ReturnType;
            unsetTextSize: () => ReturnType;
        };
    }
}

export const TextSize = Mark.create<TextSizeOptions>({
    name: 'textSize',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            size: {
                default: null,
                parseHTML: (element) => {
                    const fontSize = element.style.fontSize;
                    if (!fontSize) return null;
                    return parseInt(fontSize, 10) || null;
                },
                renderHTML: (attributes) => {
                    if (!attributes.size) return {};
                    return { style: `font-size: ${attributes.size}px` };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[style*="font-size"]',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    const fontSize = el.style.fontSize;
                    if (!fontSize) return false;
                    const size = parseInt(fontSize, 10);
                    if (!size) return false;
                    return { size };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setTextSize: (size: number) => ({ commands }) => {
                return commands.setMark(this.name, { size });
            },
            unsetTextSize: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    markdownTokenName: 'text_size',

    // 基础 tokenizer - 会被 TiptapEditorDriver 中的 patch 替换
    markdownTokenizer: {
        name: 'text_size',
        level: 'inline',
        start: (src: string) => src.indexOf('[size='),
        tokenize: (src: string) => {
            const match = /^\[size=(\d+)\]([\s\S]*?)\[\/size\]/.exec(src);
            if (!match) return undefined;
            return {
                type: 'text_size',
                raw: match[0],
                size: parseInt(match[1], 10),
                text: match[2],
                tokens: [],
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('textSize', content, { size: token.size });
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        const size = node.attrs?.size || 16;
        return `[size=${size}]${content}[/size]`;
    },
});

export default TextSize;
