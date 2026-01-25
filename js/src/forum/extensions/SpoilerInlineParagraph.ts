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
        tokenize: (src: string, tokens: any[], lexer: any) => {
            const lineMatch = /^(.*?)(?:\n|$)/.exec(src);
            if (!lineMatch) return undefined;
            
            const raw = lineMatch[0];
            const line = raw.replace(/\n$/, '');
            
            // 排除 block spoiler（">! " 开头）
            if (/^>! /.test(line)) return undefined;
            
            // 必须包含 spoiler 语法
            if (!/^>![^!]+!</.test(line) && !/\|\|[^|]+\|\|/.test(line)) return undefined;
            
            // 切片：普通片段 vs spoiler 片段
            // lexer.inlineTokens 会被 TiptapEditorDriver 中的 patch 修复
            const mixed: any[] = [];
            const re = />!([^!]+)!<|\|\|([^|]+)\|\|/g;
            let last = 0;
            let m: RegExpExecArray | null;
            
            while ((m = re.exec(line)) !== null) {
                // 普通片段 → lexer 解析
                if (m.index > last) {
                    mixed.push(...lexer.inlineTokens(line.slice(last, m.index)));
                }
                
                // spoiler 片段 → 构造 token，内部也让 lexer 解析
                const inner = m[1] ?? m[2] ?? '';
                mixed.push({
                    type: 'spoiler_inline',
                    raw: m[0],
                    text: inner,
                    tokens: lexer.inlineTokens(inner),
                });
                
                last = m.index + m[0].length;
            }
            
            // 剩余普通片段
            if (last < line.length) {
                mixed.push(...lexer.inlineTokens(line.slice(last)));
            }
            
            return {
                type: 'spoiler_inline_paragraph',
                raw,
                tokens: mixed,
            };
        },
    },

    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return { 
            type: 'paragraph', 
            content: content.length ? content : undefined 
        };
    },
});

export default SpoilerInlineParagraph;
