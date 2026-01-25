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

            // 用 lexer.blockTokens 解析内部 block 内容
            const innerTokens = lexer ? lexer.blockTokens(content) : [];

            // 对每个 paragraph token 执行 inline tokenization
            // lexer.inlineTokens 已有完整扩展，能正确解析所有 inline 语法
            if (lexer) {
                innerTokens.forEach((token: any) => {
                    if (token.type === 'paragraph' && token.text && (!token.tokens || token.tokens.length === 0)) {
                        token.tokens = lexer.inlineTokens(token.text);
                    }
                    if (token.type === 'heading' && token.text && (!token.tokens || token.tokens.length === 0)) {
                        token.tokens = lexer.inlineTokens(token.text);
                    }
                });
            }

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
        // 处理嵌套的 aligned_block
        const processTokens = (tokens: any[]): any[] => {
            const result: any[] = [];
            let i = 0;
            
            while (i < tokens.length) {
                const t = tokens[i];
                
                // 检查是否是嵌套的 aligned_block 开始标签
                if (t.type === 'paragraph' && t.text) {
                    const alignMatch = /^\[(center|right|left)\]$/.exec(t.text.trim());
                    if (alignMatch) {
                        const nestedAlign = alignMatch[1];
                        const closingTag = `[/${nestedAlign}]`;
                        const nestedContent: any[] = [];
                        i++;
                        
                        // 收集嵌套内容直到找到闭合标签
                        while (i < tokens.length) {
                            const inner = tokens[i];
                            if (inner.type === 'paragraph' && inner.text && inner.text.trim() === closingTag) {
                                i++;
                                break;
                            }
                            nestedContent.push(inner);
                            i++;
                        }
                        
                        // 递归处理嵌套内容
                        const processedNested = processTokens(nestedContent);
                        const nestedChildren = processedNested.length > 0 
                            ? processedNested 
                            : [{ type: 'paragraph' }];
                        
                        result.push({
                            type: 'alignedBlock',
                            attrs: { align: nestedAlign },
                            content: nestedChildren,
                        });
                        continue;
                    }
                }
                
                // 跳过 space token
                if (t.type === 'space') {
                    i++;
                    continue;
                }
                
                // 其他 token 交给 helpers 处理
                const parsed = helpers.parseChildren([t]);
                if (parsed && parsed.length > 0) {
                    result.push(...parsed);
                }
                i++;
            }
            
            return result;
        };
        
        const content = processTokens(token.tokens || []);
        
        return {
            type: 'alignedBlock',
            attrs: { align: token.align || 'center' },
            content: content.length > 0 ? content : [{ type: 'paragraph' }],
        };
    },

    renderMarkdown: (node: any, helpers: any) => {
        const align = node.attrs?.align || 'center';
        const content = helpers.renderChildren(node.content || [], '\n\n');
        
        return `[${align}]\n${content.trim()}\n[/${align}]\n\n`;
    },
});

export default AlignedBlock;
