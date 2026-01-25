/**
 * Get a properly configured lexer for inline tokenization.
 * 
 * Problem: Marked passes a lexer without custom extensions to tokenizers.
 * Solution: Use the globally mounted marked instance to create a fresh lexer.
 * 
 * This must be called AFTER TiptapEditorDriver.build() has run.
 */
export function getLbInlineTokens(src: string): any[] {
    const marked = (globalThis as any).__lb_marked;
    if (!marked?.Lexer) {
        // Fallback: return as plain text
        return [{ type: 'text', raw: src, text: src }];
    }
    const lexer = new marked.Lexer(marked.defaults);
    return lexer.inlineTokens(src);
}

/**
 * Get a properly configured lexer for block tokenization.
 */
export function getLbBlockTokens(src: string): any[] {
    const marked = (globalThis as any).__lb_marked;
    if (!marked?.Lexer) {
        return [{ type: 'paragraph', raw: src, text: src, tokens: [] }];
    }
    const lexer = new marked.Lexer(marked.defaults);
    return lexer.blockTokens(src);
}
