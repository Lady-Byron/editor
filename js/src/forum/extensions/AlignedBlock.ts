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

/**
 * AlignedBlock - 文本对齐容器节点
 * 
 * 用于包装需要对齐的块级内容。
 * 
 * BBCode 语法:
 * - [center]内容[/center] → 居中对齐
 * - [right]内容[/right] → 右对齐
 * - [left]内容[/left] → 左对齐（可选，因为左对齐是默认）
 * 
 * HTML 输出: <div class="aligned-block" style="text-align: center">...</div>
 */
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
        // 处理嵌套对齐块和 inline tokens 为空的情况
        const processTokens = (tokens: any[]): any[] => {
            const result: any[] = [];
            let i = 0;
            
            while (i < tokens.length) {
                const t = tokens[i];
                
                // 检测嵌套的对齐块开始标记（被错误识别为 paragraph）
                if (t.type === 'paragraph' && t.text) {
                    const alignMatch = /^\[(center|right|left)\]$/.exec(t.text.trim());
                    if (alignMatch) {
                        const nestedAlign = alignMatch[1];
                        const closingTag = `[/${nestedAlign}]`;
                        const nestedContent: any[] = [];
                        i++;
                        
                        // 收集嵌套块的内容直到找到闭合标记
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
                
                // 处理 heading - 确保 inline 内容被解析
                if (t.type === 'heading') {
                    const level = t.depth || 1;
                    let inlineContent: any[] = [];
                    
                    // 优先使用 tokens，如果为空则从 text 解析
                    if (t.tokens && t.tokens.length > 0) {
                        inlineContent = helpers.parseInline(t.tokens);
                    } else if (t.text) {
                        // 手动解析 inline 格式
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
                
                // 处理 paragraph - 确保 inline 内容被解析
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
                
                // 跳过空白 token
                if (t.type === 'space') {
                    i++;
                    continue;
                }
                
                // 其他类型使用默认解析
                const parsed = helpers.parseChildren([t]);
                if (parsed && parsed.length > 0) {
                    result.push(...parsed);
                }
                i++;
            }
            
            return result;
        };
        
        // 辅助函数：解析 inline 文本格式
        const parseInlineText = (text: string, helpers: any): any[] => {
            if (!text) return [];
            
            const result: any[] = [];
            let remaining = text;
            
            // 简单的 inline 格式解析（处理 bold、italic、bold+italic）
            const patterns = [
                // bold+italic: ***text*** 或 ___text___
                { regex: /^\*\*\*(.+?)\*\*\*/, marks: ['bold', 'italic'] },
                { regex: /^___(.+?)___/, marks: ['bold', 'italic'] },
                // bold: **text** 或 __text__
                { regex: /^\*\*(.+?)\*\*/, marks: ['bold'] },
                { regex: /^__(.+?)__/, marks: ['bold'] },
                // italic: *text* 或 _text_
                { regex: /^\*([^*]+?)\*/, marks: ['italic'] },
                { regex: /^_([^_]+?)_/, marks: ['italic'] },
                // code: `text`
                { regex: /^`([^`]+?)`/, marks: ['code'] },
                // strikethrough: ~~text~~
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
                    // 查找下一个可能的格式标记位置
                    const nextSpecial = remaining.search(/[\*_`~\[]/);
                    if (nextSpecial > 0) {
                        result.push({ type: 'text', text: remaining.slice(0, nextSpecial) });
                        remaining = remaining.slice(nextSpecial);
                    } else if (nextSpecial === -1) {
                        // 没有更多格式标记，添加剩余文本
                        if (remaining.length > 0) {
                            result.push({ type: 'text', text: remaining });
                        }
                        break;
                    } else {
                        // nextSpecial === 0 但没有匹配任何模式，跳过一个字符
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
        // 使用双换行作为块级子节点的分隔符，确保 heading/paragraph 之间正确分隔
        const content = helpers.renderChildren(node.content || [], '\n\n');
        
        return `[${align}]\n${content.trim()}\n[/${align}]\n\n`;
    },
});

export default AlignedBlock;
