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

            // 对每个 paragraph token 执行 inline tokenization
            if (lexer) {
                innerTokens.forEach((token: any) => {
                    if (token.type === 'paragraph' && token.text && (!token.tokens || token.tokens.length === 0)) {
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
        const processTokens = (tokens: any[]): any[] => {
            const result: any[] = [];
            let i = 0;
            
            while (i < tokens.length) {
                const t = tokens[i];
                
                if (t.type === 'paragraph' && t.text) {
                    const alignMatch = /^\[(center|right|left)\]$/.exec(t.text.trim());
                    if (alignMatch) {
                        const nestedAlign = alignMatch[1];
                        const closingTag = `[/${nestedAlign}]`;
                        const nestedContent: any[] = [];
                        i++;
                        
                        while (i < tokens.length) {
                            const inner = tokens[i];
                            if (inner.type === 'paragraph' && inner.text && inner.text.trim() === closingTag) {
                                i++;
                                break;
                            }
                            nestedContent.push(inner);
                            i++;
                        }
                        
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
                
                if (t.type === 'heading') {
                    const level = t.depth || 1;
                    let inlineContent: any[] = [];
                    
                    if (t.tokens && t.tokens.length > 0) {
                        inlineContent = helpers.parseInline(t.tokens);
                    } else if (t.text) {
                        inlineContent = parseInlineText(t.text, helpers);
                    }
                    
                    result.push({
                        type: 'heading',
                        attrs: { level },
                        content: inlineContent.length > 0 ? inlineContent : undefined,
                    });
                    i++;
                    continue;
                }
                
                if (t.type === 'paragraph') {
                    let inlineContent: any[] = [];
                    
                    if (t.tokens && t.tokens.length > 0) {
                        inlineContent = helpers.parseInline(t.tokens);
                    } else if (t.text) {
                        inlineContent = parseInlineText(t.text, helpers);
                    }
                    
                    result.push({
                        type: 'paragraph',
                        content: inlineContent.length > 0 ? inlineContent : undefined,
                    });
                    i++;
                    continue;
                }
                
                if (t.type === 'space') {
                    i++;
                    continue;
                }
                
                const parsed = helpers.parseChildren([t]);
                if (parsed && parsed.length > 0) {
                    result.push(...parsed);
                }
                i++;
            }
            
            return result;
        };
        
        const parseInlineText = (text: string, helpers: any): any[] => {
            if (!text) return [];
            
            const result: any[] = [];
            let remaining = text;
            
            const patterns = [
                { regex: /^\*\*\*(.+?)\*\*\*/, marks: ['bold', 'italic'] },
                { regex: /^___(.+?)___/, marks: ['bold', 'italic'] },
                { regex: /^\*\*(.+?)\*\*/, marks: ['bold'] },
                { regex: /^__(.+?)__/, marks: ['bold'] },
                { regex: /^\*([^*]+?)\*/, marks: ['italic'] },
                { regex: /^_([^_]+?)_/, marks: ['italic'] },
                { regex: /^`([^`]+?)`/, marks: ['code'] },
                { regex: /^~~(.+?)~~/, marks: ['strike'] },
            ];
            
            while (remaining.length > 0) {
                let matched = false;
                
                for (const pattern of patterns) {
                    const match = pattern.regex.exec(remaining);
                    if (match) {
                        const innerText = match[1];
                        const marks = pattern.marks.map(m => ({ type: m }));
                        result.push({
                            type: 'text',
                            text: innerText,
                            marks: marks,
                        });
                        remaining = remaining.slice(match[0].length);
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    const nextSpecial = remaining.search(/[\*_`~\[]/);
                    if (nextSpecial > 0) {
                        result.push({ type: 'text', text: remaining.slice(0, nextSpecial) });
                        remaining = remaining.slice(nextSpecial);
                    } else if (nextSpecial === -1) {
                        if (remaining.length > 0) {
                            result.push({ type: 'text', text: remaining });
                        }
                        break;
                    } else {
                        result.push({ type: 'text', text: remaining[0] });
                        remaining = remaining.slice(1);
                    }
                }
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
