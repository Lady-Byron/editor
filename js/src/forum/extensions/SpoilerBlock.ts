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
            toggleSpoilerBlock: () => ({ commands, state }) => {
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

    markdownTokenizer: {
        name: 'spoiler_block',
        level: 'block',
        start: (src: string) => {
            const match = /^>! /m.exec(src);
            return match ? match.index : -1;
        },
        // 必须是 function，不能是箭头函数
        tokenize: function (src: string, tokens: any[], lexer: any) {
            const lx = (this as any)?.lexer || lexer;
            
            const match = /^(?:>! .*(?:\n|$))+/.exec(src);
            if (!match) return undefined;
            
            const rawContent = match[0];
            const lines = rawContent
                .split('\n')
                .map((line: string) => line.replace(/^>! ?/, ''))
                .filter((line: string) => line.length > 0 || rawContent.includes('\n'));
            
            // 为每一行创建段落 token
            const paragraphTokens = lines
                .filter((line: string) => line.trim().length > 0)
                .map((line: string) => ({
                    type: 'paragraph',
                    raw: line,
                    text: line,
                    tokens: lx ? lx.inlineTokens(line) : [],
                }));
            
            return {
                type: 'spoiler_block',
                raw: rawContent,
                text: lines.join('\n').trim(),
                tokens: paragraphTokens,
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
            content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
        };
    },

    renderMarkdown: (node: any, helpers: any, context: any) => {
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
                    if (updatedNode.type.name !== this.name) return false;
                    dom.className = 'spoiler-block' + (updatedNode.attrs.open ? ' is-open' : '');
                    return true;
                },
            };
        };
    },
});

export default SpoilerBlock;
