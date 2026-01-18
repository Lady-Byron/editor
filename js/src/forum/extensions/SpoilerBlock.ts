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
                const { from, to } = state.selection;
                const node = state.doc.nodeAt(from);
                
                // 如果当前在 spoilerBlock 内，则解除
                if (this.editor.isActive(this.name)) {
                    return commands.lift(this.name);
                }
                // 否则包装选区
                return commands.wrapIn(this.name);
            },
            unsetSpoilerBlock: () => ({ commands }) => {
                return commands.lift(this.name);
            },
        };
    },

    // Markdown token 名称
    markdownTokenName: 'spoiler_block',

    // Markdown tokenizer: 识别 >! 开头的连续行 (V3 API)
    markdownTokenizer: {
        name: 'spoiler_block',
        level: 'block',
        start: (src: string) => {
            // 只在行首匹配 >! (后跟空格，区别于 >!text!<)
            const match = /^>! /m.exec(src);
            return match ? match.index : -1;
        },
        tokenize: (src: string, tokens: any[], lexer: any) => {
            // 匹配连续的 >! 开头的行
            const match = /^(?:>! .*(?:\n|$))+/.exec(src);
            if (!match) return undefined;
            
            // 去掉每行的 >! 前缀
            const content = match[0]
                .split('\n')
                .map((line: string) => line.replace(/^>! ?/, ''))
                .join('\n')
                .trim();
            
            return {
                type: 'spoiler_block',
                raw: match[0],
                text: content,
                // 使用 lexer 解析内部的 markdown（如加粗、斜体等）
                tokens: lexer ? lexer.blockTokens(content) : [],
            };
        },
    },

    // Token → Tiptap JSON (V3 API)
    parseMarkdown: (token: any, helpers: any) => {
        // 使用 helpers.parseChildren 解析嵌套的 tokens（包含格式化信息）
        const content = helpers.parseChildren(token.tokens || []);
        
        return {
            type: 'spoilerBlock',
            attrs: { open: false },
            content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
        };
    },

    // Tiptap JSON → Markdown (V3 API)
    renderMarkdown: (node: any, helpers: any, context: any) => {
        const content = helpers.renderChildren(node.content || []);
        // 每行添加 >! 前缀
        const lines = content.trim().split('\n');
        return lines.map((line: string) => `>! ${line}`).join('\n') + '\n\n';
    },

    // 添加点击切换展开/折叠的功能
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
