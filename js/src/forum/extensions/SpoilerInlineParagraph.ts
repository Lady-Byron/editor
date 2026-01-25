import { Node } from '@tiptap/core';

export const SpoilerInlineParagraph = Node.create({
    name: 'spoilerInlineParagraph',

    markdownTokenName: 'spoiler_inline_paragraph',

    markdownTokenizer: {
        name: 'spoiler_inline_paragraph',
        level: 'block',
        start: (src: string) => {
            const match = /^>![^\s]/.exec(src);
            return match ? 0 : -1;
        },
        tokenize: (src: string) => {
            // 不需要 lexer 参数，因为它没有自定义扩展
            const lineMatch = /^(.*?)(?:\n|$)/.exec(src);
            if (!lineMatch) return undefined;
            
            const raw = lineMatch[0];
            const line = raw.replace(/\n$/, '');
            
            // 排除 block spoiler（">! " 开头）
            if (/^>! /.test(line)) return undefined;
            
            // 必须包含 spoiler 语法
            if (!/^>![^!]+!</.test(line) && !/\|\|[^|]+\|\|/.test(line)) return undefined;
            
            // 只返回原始文本，不调用 lexer.inlineTokens()
            // 所有解析在 parseMarkdown 中用 helpers 完成
            return {
                type: 'spoiler_inline_paragraph',
                raw,
                text: line,
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const text = token.text;
        const content: any[] = [];
        
        // 切片：找出所有 spoiler 片段
        const re = />!([^!]+)!<|\|\|([^|]+)\|\|/g;
        let last = 0;
        let m: RegExpExecArray | null;
        
        while ((m = re.exec(text)) !== null) {
            // 普通片段 → 用 helpers 解析
            if (m.index > last) {
                const plainText = text.slice(last, m.index);
                const plainContent = helpers.parseInline(plainText);
                content.push(...plainContent);
            }
            
            // spoiler 片段 → 用 helpers 解析内部，然后添加 spoilerInline mark
            const inner = m[1] ?? m[2] ?? '';
            const spoilerContent = helpers.parseInline(inner);
            
            // 给每个节点添加 spoilerInline mark
            spoilerContent.forEach((node: any) => {
                if (node.type === 'text') {
                    node.marks = node.marks || [];
                    node.marks.unshift({ type: 'spoilerInline' });
                } else if (node.marks) {
                    node.marks.unshift({ type: 'spoilerInline' });
                }
            });
            
            content.push(...spoilerContent);
            last = m.index + m[0].length;
        }
        
        // 剩余普通片段
        if (last < text.length) {
            const remainingText = text.slice(last);
            const remainingContent = helpers.parseInline(remainingText);
            content.push(...remainingContent);
        }
        
        return { 
            type: 'paragraph', 
            content: content.length ? content : undefined 
        };
    },
});

export default SpoilerInlineParagraph;
