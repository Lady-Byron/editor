import { Node, mergeAttributes } from '@tiptap/core';

export interface SpoilerBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        spoilerBlock: {
            setSpoilerBlock: () => ReturnType;
            toggleSpoilerBlock: () => ReturnType;
            unsetSpoilerBlock: () => ReturnType;
        };
    }
}

export const SpoilerBlock = Node.create<SpoilerBlockOptions>({
    name: 'spoilerBlock',

    group: 'block',

    content: 'block+',

    defining: true,

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'spoiler-block',
            },
        };
    },

    addAttributes() {
        return {
            open: {
                default: false,
                parseHTML: (element) => element.classList.contains('is-open'),
                renderHTML: (attributes) => {
                    if (!attributes.open) return {};
                    return { class: 'is-open' };
                },
            },
        };
    },

    parseHTML() {
        return [
            { tag: 'spoiler' },
            { tag: 'div.spoiler-block' },
            { tag: 'div.spoiler' },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        const classes = ['spoiler-block'];
        if (node.attrs.open) classes.push('is-open');

        return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: classes.join(' ') }), 0];
    },

    addCommands() {
        return {
            setSpoilerBlock: () => ({ commands }) => {
                return commands.wrapIn(this.name);
            },
            toggleSpoilerBlock: () => ({ commands }) => {
                if (this.editor.isActive(this.name)) {
                    return commands.lift(this.name);
                }
                return commands.wrapIn(this.name);
            },
            unsetSpoilerBlock: () => ({ commands }) => {
                return commands.lift(this.name);
            },
        };
    },

    markdownTokenName: 'spoiler_block',

    // 基础 tokenizer - 会被 TiptapEditorDriver 中的 patch 替换
    markdownTokenizer: {
        name: 'spoiler_block',
        level: 'block',
        start: (src: string) => {
            const match = /^>! /m.exec(src);
            return match ? match.index : -1;
        },
        tokenize: (src: string) => {
            const match = /^(?:>! .*(?:\n|$))+/.exec(src);
            if (!match) return undefined;

            return {
                type: 'spoiler_block',
                raw: match[0],
                text: '',
                tokens: [],
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content: any[] = [];

        for (const paragraphToken of (token.tokens || [])) {
            if (paragraphToken.type === 'paragraph' && paragraphToken.tokens) {
                const inlineContent = helpers.parseInline(paragraphToken.tokens);
                content.push({
                    type: 'paragraph',
                    content: inlineContent.length > 0 ? inlineContent : undefined,
                });
            }
        }

        return {
            type: 'spoilerBlock',
            attrs: { open: false },
            content: content.length > 0 ? content : [{ type: 'paragraph' }],
        };
    },

    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node.content || []);
        const lines = content.trim().split('\n');
        return lines.map((line: string) => `>! ${line}`).join('\n') + '\n\n';
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('div');
            dom.className = 'spoiler-block' + (node.attrs.open ? ' is-open' : '');

            const header = document.createElement('div');
            header.className = 'spoiler-block-header';
            header.innerHTML = '<span class="spoiler-block-icon"></span><span class="spoiler-block-label"></span>';
            header.addEventListener('click', (e) => {
                if (typeof getPos === 'function') {
                    const pos = getPos();
                    if (pos !== undefined) {
                        editor.chain().focus().updateAttributes('spoilerBlock', { open: !node.attrs.open }).run();
                    }
                }
                e.preventDefault();
                e.stopPropagation();
            });

            const contentDOM = document.createElement('div');
            contentDOM.className = 'spoiler-block-content';

            dom.appendChild(header);
            dom.appendChild(contentDOM);

            return {
                dom,
                contentDOM,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== 'spoilerBlock') return false;
                    dom.className = 'spoiler-block' + (updatedNode.attrs.open ? ' is-open' : '');
                    return true;
                },
            };
        };
    },
});

export default SpoilerBlock;
