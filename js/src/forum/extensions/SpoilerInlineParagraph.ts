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
        tokenize: (src: string, tokens: any[]) => {
            const lineMatch = /^(.*?)(?:\n|$)/.exec(src);
            if (!lineMatch) return undefined;
            
            const line = lineMatch[0];
            
            if (/^>! /.test(line)) {
                return undefined;
            }
            
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

    parseMarkdown: (token: any, helpers: any) => {
        const text = token.text;
        const content: any[] = [];
        
        const spoilerRegex = />!([^!]+)!</g;
        const pipeRegex = /\|\|([^|]+)\|\|/g;
        
        let lastIndex = 0;
        let combinedMatches: { index: number; length: number; text: string; type: 'spoiler' }[] = [];
        
        let match;
        while ((match = spoilerRegex.exec(text)) !== null) {
            combinedMatches.push({
                index: match.index,
                length: match[0].length,
                text: match[1],
                type: 'spoiler',
            });
        }
        
        while ((match = pipeRegex.exec(text)) !== null) {
            combinedMatches.push({
                index: match.index,
                length: match[0].length,
                text: match[1],
                type: 'spoiler',
            });
        }
        
        combinedMatches.sort((a, b) => a.index - b.index);
        
        const parseInlineWithSpoiler = (innerText: string): any[] => {
            const result: any[] = [];
            let remaining = innerText;
            
            // Note: Order matters! More specific patterns must come first
            // - strike (~~) before subscript (~) to avoid conflicts
            // - superscript with parens ^() before ^text^
            // - subscript with parens ~() before ~text~
            const patterns = [
                { regex: /^\*\*\*(.+?)\*\*\*/, marks: ['bold', 'italic'] },
                { regex: /^___(.+?)___/, marks: ['bold', 'italic'] },
                { regex: /^\*\*(.+?)\*\*/, marks: ['bold'] },
                { regex: /^__(.+?)__/, marks: ['bold'] },
                { regex: /^\*([^*]+?)\*/, marks: ['italic'] },
                { regex: /^_([^_]+?)_/, marks: ['italic'] },
                { regex: /^`([^`]+?)`/, marks: ['code'] },
                { regex: /^~~(.+?)~~/, marks: ['strike'] },
                { regex: /^\^\(([^)]+)\)/, marks: ['superscript'] },
                { regex: /^\^([^\^\s]+)\^/, marks: ['superscript'] },
                { regex: /^~\(([^)]+)\)/, marks: ['subscript'] },
                { regex: /^~([^~\s]+)~(?!~)/, marks: ['subscript'] },
            ];
            
            while (remaining.length > 0) {
                let matched = false;
                
                for (const pattern of patterns) {
                    const m = pattern.regex.exec(remaining);
                    if (m) {
                        const innerContent = m[1];
                        const marks = [
                            { type: 'spoilerInline' },
                            ...pattern.marks.map(mark => ({ type: mark }))
                        ];
                        result.push({
                            type: 'text',
                            text: innerContent,
                            marks: marks,
                        });
                        remaining = remaining.slice(m[0].length);
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    const nextSpecial = remaining.search(/[\*_`~\^]/);
                    if (nextSpecial > 0) {
                        result.push({ 
                            type: 'text', 
                            text: remaining.slice(0, nextSpecial),
                            marks: [{ type: 'spoilerInline' }],
                        });
                        remaining = remaining.slice(nextSpecial);
                    } else if (nextSpecial === -1) {
                        if (remaining.length > 0) {
                            result.push({ 
                                type: 'text', 
                                text: remaining,
                                marks: [{ type: 'spoilerInline' }],
                            });
                        }
                        break;
                    } else {
                        result.push({ 
                            type: 'text', 
                            text: remaining[0],
                            marks: [{ type: 'spoilerInline' }],
                        });
                        remaining = remaining.slice(1);
                    }
                }
            }
            
            return result;
        };
        
        const parseInlineText = (plainText: string): any[] => {
            const result: any[] = [];
            let remaining = plainText;
            
            // Note: Order matters! More specific patterns must come first
            const patterns = [
                { regex: /^\*\*\*(.+?)\*\*\*/, marks: ['bold', 'italic'] },
                { regex: /^___(.+?)___/, marks: ['bold', 'italic'] },
                { regex: /^\*\*(.+?)\*\*/, marks: ['bold'] },
                { regex: /^__(.+?)__/, marks: ['bold'] },
                { regex: /^\*([^*]+?)\*/, marks: ['italic'] },
                { regex: /^_([^_]+?)_/, marks: ['italic'] },
                { regex: /^`([^`]+?)`/, marks: ['code'] },
                { regex: /^~~(.+?)~~/, marks: ['strike'] },
                { regex: /^\^\(([^)]+)\)/, marks: ['superscript'] },
                { regex: /^\^([^\^\s]+)\^/, marks: ['superscript'] },
                { regex: /^~\(([^)]+)\)/, marks: ['subscript'] },
                { regex: /^~([^~\s]+)~(?!~)/, marks: ['subscript'] },
            ];
            
            while (remaining.length > 0) {
                let matched = false;
                
                for (const pattern of patterns) {
                    const m = pattern.regex.exec(remaining);
                    if (m) {
                        const innerContent = m[1];
                        const marks = pattern.marks.map(mark => ({ type: mark }));
                        result.push({
                            type: 'text',
                            text: innerContent,
                            marks: marks,
                        });
                        remaining = remaining.slice(m[0].length);
                        matched = true;
                        break;
                    }
                }
                
                if (!matched) {
                    const nextSpecial = remaining.search(/[\*_`~\^]/);
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
        
        for (const m of combinedMatches) {
            if (m.index > lastIndex) {
                const plainText = text.slice(lastIndex, m.index);
                if (plainText) {
                    const parsedPlain = parseInlineText(plainText);
                    content.push(...parsedPlain);
                }
            }
            
            const parsedSpoiler = parseInlineWithSpoiler(m.text);
            content.push(...parsedSpoiler);
            
            lastIndex = m.index + m.length;
        }
        
        if (lastIndex < text.length) {
            const remaining = text.slice(lastIndex);
            if (remaining) {
                const parsedRemaining = parseInlineText(remaining);
                content.push(...parsedRemaining);
            }
        }
        
        return {
            type: 'paragraph',
            content: content.length > 0 ? content : undefined,
        };
    },
});

export default SpoilerInlineParagraph;
