import { BulletList, OrderedList } from '@tiptap/extension-list';

// 辅助函数：解析包含 spoiler 的 inline 内容
const parseSpoilerInlineContent = (tokens: any[], helpers: any): any[] => {
    const result: any[] = [];
    
    // 检测 >!...!< 模式的辅助函数
    const processSpoilerPattern = (items: any[]): any[] => {
        const processed: any[] = [];
        let i = 0;
        
        while (i < items.length) {
            const current = items[i];
            
            // 检测 ">!" 开始标记
            if (current.type === 'text' && current.text === '>!' && i + 2 < items.length) {
                // 查找匹配的 "!<" 结束标记
                let j = i + 1;
                const spoilerContent: any[] = [];
                let found = false;
                
                while (j < items.length) {
                    const item = items[j];
                    if (item.type === 'text' && item.text === '!<') {
                        found = true;
                        break;
                    }
                    spoilerContent.push(item);
                    j++;
                }
                
                if (found && spoilerContent.length > 0) {
                    // 将中间内容添加 spoilerInline mark
                    for (const content of spoilerContent) {
                        const existingMarks = content.marks || [];
                        processed.push({
                            ...content,
                            marks: [{ type: 'spoilerInline' }, ...existingMarks],
                        });
                    }
                    i = j + 1; // 跳过 "!<"
                    continue;
                }
            }
            
            // 不是 spoiler 模式，保持原样
            processed.push(current);
            i++;
        }
        
        return processed;
    };
    
    // 先用 helpers 解析 inline tokens
    const parsed = helpers.parseInline(tokens);
    
    // 然后处理 spoiler 模式
    return processSpoilerPattern(parsed);
};

// 辅助函数：递归处理列表项内容
const processListItemTokens = (tokens: any[], helpers: any): any[] => {
    const content: any[] = [];
    
    for (const token of tokens) {
        if (token.type === 'paragraph' && token.tokens) {
            const inlineContent = parseSpoilerInlineContent(token.tokens, helpers);
            content.push({
                type: 'paragraph',
                content: inlineContent.length > 0 ? inlineContent : undefined,
            });
        } else if (token.type === 'spoiler_inline_paragraph') {
            // 由 SpoilerInlineParagraph 处理
            const parsed = helpers.parseChildren([token]);
            if (parsed && parsed.length > 0) {
                content.push(...parsed);
            }
        } else if (token.type === 'list') {
            // 嵌套列表
            const nestedList = parseListToken(token, helpers);
            if (nestedList) {
                content.push(nestedList);
            }
        } else {
            // 其他类型
            const parsed = helpers.parseChildren([token]);
            if (parsed && parsed.length > 0) {
                content.push(...parsed);
            }
        }
    }
    
    return content;
};

// 解析列表 token
const parseListToken = (token: any, helpers: any): any => {
    const items: any[] = [];
    
    for (const item of (token.items || [])) {
        const itemContent = processListItemTokens(item.tokens || [], helpers);
        items.push({
            type: 'listItem',
            content: itemContent.length > 0 ? itemContent : [{ type: 'paragraph' }],
        });
    }
    
    if (token.ordered) {
        return {
            type: 'orderedList',
            attrs: { start: token.start || 1 },
            content: items,
        };
    } else {
        return {
            type: 'bulletList',
            content: items,
        };
    }
};

export const CustomBulletList = BulletList.extend({
    parseMarkdown: (token: any, helpers: any) => {
        return parseListToken(token, helpers);
    },
});

export const CustomOrderedList = OrderedList.extend({
    parseMarkdown: (token: any, helpers: any) => {
        return parseListToken(token, helpers);
    },
});
