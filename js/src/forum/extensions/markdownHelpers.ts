/**
 * Helper function to get a properly configured lexer and tokenize inline content.
 * 
 * Problem: Tokenizers receive a lexer parameter without custom extensions,
 * causing nested inline syntax (subscript, superscript, spoiler, etc.) to fail.
 * 
 * Solution: Use globalThis.__lb_marked (set by TiptapEditorDriver) to create
 * a fresh, properly configured lexer for each call.
 */
export function lbInlineTokens(src: string): any[] {
    const marked = (globalThis as any).__lb_marked;
    if (!marked?.Lexer) {
        // Fallback: return as plain text if marked not available
        return [{ type: 'text', raw: src, text: src }];
    }
    const lexer = new marked.Lexer(marked.defaults);
    return lexer.inlineTokens(src);
}

/**
 * Helper function to tokenize block content with proper extensions.
 */
export function lbBlockTokens(src: string): any[] {
    const marked = (globalThis as any).__lb_marked;
    if (!marked?.Lexer) {
        return [];
    }
    const lexer = new marked.Lexer(marked.defaults);
    return lexer.blockTokens(src);
}
