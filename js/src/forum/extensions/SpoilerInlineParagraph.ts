import { Node } from '@tiptap/core';

/**
 * SpoilerInlineParagraph - 处理行首的 >!text!< 语法
 * 
 * 这是一个块级扩展，用于在 blockquote 之前捕获行首的 >!text!< 模式。
 * 区别于 SpoilerBlock 的 ">! text"（有空格），这里处理的是紧跟字符的情况。
 * 
 * 例如：
 * - ">!spoiler!<" → 段落内包含 spoilerInline mark
 * - ">! text" → 由 SpoilerBlock 处理（折叠块）
 */
export const SpoilerInlineParagraph = Node.create({
    name: 'spoilerInlineParagraph',

    // 这是一个辅助扩展，不定义自己的 schema
    // 它只提供 markdown 解析功能，输出为普通 paragraph + spoilerInline mark

    // Markdown token 名称
    markdownTokenName: 'spoiler_inline_paragraph',

    // 块级 Markdown tokenizer: 识别行首的 >!text!< 模式
    markdownTokenizer: {
        name: 'spoiler_inline_paragraph',
        level: 'block',
        start: (src: string) => {
            // 匹配行首的 >! 且后面紧跟非空格字符（区别于 >! text 块级折叠）
            const match = /^>![^\s]/.exec(src);
            return match ? 0 : -1;
        },
        tokenize: (src: string, tokens: any[]) => {
            // 匹配整行: >!content!< (可能有多个 spoiler 片段和普通文本)
            // 只匹配以 >! 开头的行
            const lineMatch = /^(.*?)(?:\n|$)/.exec(src);
            if (!lineMatch) return undefined;
            
            const line = lineMatch[0];
            
            // 确保是 >!text!< 格式而不是 >! text (块级折叠)
            if (/^>! /.test(line)) {
                return undefined; // 让 SpoilerBlock 处理
            }
            
            // 检查行中是否包含 >!...!< 模式
            if (!/^>![^!]+!</.test(line)) {
                return undefined;
            }
            
            return {
                type: 'spoiler_inline_paragraph',
                raw: line,
                text: line.replace(/\n$/, ''),
            };
        },
    },

    // Token → Tiptap JSON
    // 将整行解析为段落，其中 >!text!< 部分应用 spoilerInline mark
    parseMarkdown: (token: any, helpers: any) => {
        const text = token.text;
        const content: any[] = [];
        
        // 解析行中的 >!text!< 和 ||text|| 模式
        const spoilerRegex = />!([^!]+)!</g;
        const pipeRegex = /\|\|([^|]+)\|\|/g;
        
        let lastIndex = 0;
        let combinedMatches: { index: number; length: number; text: string; type: 'spoiler' }[] = [];
        
        // 收集所有 >!text!< 匹配
        let match;
        while ((match = spoilerRegex.exec(text)) !== null) {
            combinedMatches.push({
                index: match.index,
                length: match[0].length,
                text: match[1],
                type: 'spoiler',
            });
        }
        
        // 收集所有 ||text|| 匹配
        while ((match = pipeRegex.exec(text)) !== null) {
            combinedMatches.push({
                index: match.index,
                length: match[0].length,
                text: match[1],
                type: 'spoiler',
            });
        }
        
        // 按位置排序
        combinedMatches.sort((a, b) => a.index - b.index);
        
        // 构建内容数组
        for (const m of combinedMatches) {
            // 添加 spoiler 之前的普通文本
            if (m.index > lastIndex) {
                const plainText = text.slice(lastIndex, m.index);
                if (plainText) {
                    content.push({ type: 'text', text: plainText });
                }
            }
            
            // 添加 spoiler 文本（带 mark）
            content.push({
                type: 'text',
                text: m.text,
                marks: [{ type: 'spoilerInline' }],
            });
            
            lastIndex = m.index + m.length;
        }
        
        // 添加剩余的普通文本
        if (lastIndex < text.length) {
            const remaining = text.slice(lastIndex);
            if (remaining) {
                content.push({ type: 'text', text: remaining });
            }
        }
        
        return {
            type: 'paragraph',
            content: content.length > 0 ? content : undefined,
        };
    },

    // 不需要 renderMarkdown，因为渲染时由 paragraph + spoilerInline mark 处理
});

export default SpoilerInlineParagraph;
