/**
 * Marked Helper - 提供正确配置的 lexer 用于自定义 tokenizer
 * 
 * 问题背景：
 * Marked 传递给 tokenizer 的 lexer 没有自定义扩展，导致嵌套语法无法正确解析。
 * 解决方案：通过 globalThis.__lb_marked 获取正确配置的 marked 实例。
 * 
 * 重要：TiptapEditorDriver.build() 必须先执行以挂载 __lb_marked
 */

/**
 * Get a properly configured lexer for inline tokenization.
 * 
 * @param src - 要解析的源文本
 * @returns inline token 数组
 */
export function getLbInlineTokens(src: string): any[] {
    const marked = (globalThis as any).__lb_marked;
    if (!marked?.Lexer) {
        // Fallback: 返回纯文本 token
        return [{ type: 'text', raw: src, text: src }];
    }
    const lexer = new marked.Lexer(marked.defaults);
    return lexer.inlineTokens(src);
}

/**
 * Get a properly configured lexer for block tokenization.
 * 
 * 重要：此函数会完整处理 inlineQueue，避免污染主 lexer 的状态。
 * 
 * @param src - 要解析的源文本
 * @returns block token 数组（包含已处理的 inline tokens）
 */
export function getLbBlockTokens(src: string): any[] {
    const marked = (globalThis as any).__lb_marked;
    if (!marked?.Lexer) {
        return [{ type: 'paragraph', raw: src, text: src, tokens: [] }];
    }
    
    const lexer = new marked.Lexer(marked.defaults);
    const tokens = lexer.blockTokens(src);
    
    // 关键修复：处理 inlineQueue，完成所有 inline tokenization
    // Marked 的 blockTokens 会将 inline 处理任务放入队列，
    // 如果不处理，这些任务会泄漏到主 lexer，导致后续 paragraph 的 tokens 为空
    while (lexer.inlineQueue.length) {
        const item = lexer.inlineQueue.shift();
        lexer.inlineTokens(item.src, item.tokens);
    }
    
    return tokens;
}
