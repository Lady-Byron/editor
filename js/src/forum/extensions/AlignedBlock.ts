import { Node, mergeAttributes } from '@tiptap/core';

export type TextAlignment = 'left' | 'center' | 'right';

export interface AlignedBlockOptions {
    HTMLAttributes: Record<string, any>;
    alignments: TextAlignment[];
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        alignedBlock: {
            setTextAlign: (alignment: TextAlignment) => ReturnType;
            unsetTextAlign: () => ReturnType;
            toggleTextAlign: (alignment: TextAlignment) => ReturnType;
        };
    }
}

const ALIGN_BLOCK_REGEX = /^\[(center|right|left)\]\n?([\s\S]*?)\[\/\1\]/;

export const AlignedBlock = Node.create<AlignedBlockOptions>({
    name: 'alignedBlock',

    group: 'block',

    content: 'block+',

    defining: true,

    priority: 50,

    addOptions() {
        return {
            HTMLAttributes: {},
            alignments: ['left', 'center', 'right'],
        };
    },

    addAttributes() {
        return {
            align: {
                default: 'center',
                parseHTML: (element) => {
                    const style = element.style.textAlign;
                    const dataAlign = element.getAttribute('data-align');
                    return dataAlign || style || 'center';
                },
                renderHTML: (attributes) => {
                    return {
                        'data-align': attributes.align,
                        style: `text-align: ${attributes.align}`,
                    };
                },
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'center' },
            { tag: 'div.aligned-block' },
            { tag: 'div.text-center', attrs: { align: 'center' } },
            { tag: 'div.text-right', attrs: { align: 'right' } },
            { tag: 'div.text-left', attrs: { align: 'left' } },
            {
                tag: 'div[style*="text-align"]',
                getAttrs: (element) => {
                    const el = element as HTMLElement;
                    const align = el.style.textAlign;
                    if (['left', 'center', 'right'].includes(align)) {
                        return { align };
                    }
                    return false;
                },
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        const align = node.attrs.align || 'center';
        return [
            'div',
            mergeAttributes(
                this.options.HTMLAttributes,
                HTMLAttributes,
                {
                    class: 'aligned-block',
                    'data-align': align,
                    style: `text-align: ${align}`,
                }
            ),
            0,
        ];
    },

    addCommands() {
        return {
            setTextAlign: (alignment: TextAlignment) => ({ commands, state }) => {
                if (this.editor.isActive(this.name)) {
                    return commands.updateAttributes(this.name, { align: alignment });
                }
                return commands.wrapIn(this.name, { align: alignment });
            },
            unsetTextAlign: () => ({ commands }) => {
                return commands.lift(this.name);
            },
            toggleTextAlign: (alignment: TextAlignment) => ({ commands, state }) => {
                if (this.editor.isActive(this.name, { align: alignment })) {
                    return commands.lift(this.name);
                }
                if (this.editor.isActive(this.name)) {
                    return commands.updateAttributes(this.name, { align: alignment });
                }
                return commands.wrapIn(this.name, { align: alignment });
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-l': () => this.editor.commands.toggleTextAlign('left'),
            'Mod-Shift-e': () => this.editor.commands.toggleTextAlign('center'),
            'Mod-Shift-r': () => this.editor.commands.toggleTextAlign('right'),
        };
    },

    markdownTokenName: 'aligned_block',

    markdownTokenizer: {
        name: 'aligned_block',
        level: 'block',
        start: (src: string) => {
            const match = /^\[(center|right|left)\]/.exec(src);
            return match ? 0 : -1;
        },
        tokenize: (src: string, tokens: any[], lexer: any) => {
            const match = ALIGN_BLOCK_REGEX.exec(src);
            if (!match) return undefined;

            const alignment = match[1] as TextAlignment;
            const content = match[2];

            const innerTokens = lexer ? lexer.blockTokens(content) : [];

            return {
                type: 'aligned_block',
                raw: match[0],
                align: alignment,
                text: content,
                tokens: innerTokens,
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseChildren(token.tokens || []);
        return {
            type: 'alignedBlock',
            attrs: { align: token.align || 'center' },
            content: content.length > 0 ? content : [{ type: 'paragraph' }],
        };
    },

    renderMarkdown: (node: any, helpers: any) => {
        const align = node.attrs?.align || 'center';
        const content = helpers.renderChildren(node.content || []);
        
        return `[${align}]\n${content.trim()}\n[/${align}]\n\n`;
    },
});

export default AlignedBlock;
