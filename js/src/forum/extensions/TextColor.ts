import { Mark, mergeAttributes } from '@tiptap/core';

export interface TextColorOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        textColor: {
            setTextColor: (color: string) => ReturnType;
            unsetTextColor: () => ReturnType;
        };
    }
}

const COLOR_REGEX = /^\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/;

export const TextColor = Mark.create<TextColorOptions>({
    name: 'textColor',

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            color: {
                default: null,
                parseHTML: (element) => {
                    return element.style.color || element.getAttribute('data-color');
                },
                renderHTML: (attributes) => {
                    if (!attributes.color) return {};
                    return { style: `color: ${attributes.color}` };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[style*="color"]',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    const color = el.style.color;
                    if (!color) return false;
                    return { color };
                },
            },
            {
                tag: 'span[data-color]',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    return { color: el.getAttribute('data-color') };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setTextColor: (color: string) => ({ commands }) => {
                return commands.setMark(this.name, { color });
            },
            unsetTextColor: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    markdownTokenName: 'text_color',

    markdownTokenizer: {
        name: 'text_color',
        level: 'inline',
        start: (src: string) => src.indexOf('[color='),
        tokenize: (src: string, tokens: any[], lexer: any) => {
            const match = COLOR_REGEX.exec(src);
            if (!match) return undefined;
            return {
                type: 'text_color',
                raw: match[0],
                color: match[1],
                text: match[2],
                tokens: lexer.inlineTokens(match[2]),
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('textColor', content, { color: token.color });
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        const color = node.attrs?.color || '';
        return `[color=${color}]${content}[/color]`;
    },
});

export default TextColor;
