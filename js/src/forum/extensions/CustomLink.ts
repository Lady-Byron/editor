import Link from '@tiptap/extension-link';

/**
 * CustomLink - 扩展 Tiptap Link 支持 title 属性
 * 
 * Tiptap 默认的 Link 扩展只支持 href 和 target，
 * 我们需要添加 title 属性支持，使链接悬停时能显示提示文字。
 * 
 * Markdown 语法: [text](url "title")
 * HTML 输出: <a href="url" title="title">text</a>
 */
export const CustomLink = Link.extend({
    addAttributes() {
        return {
            // 保留父类的所有属性
            ...this.parent?.(),
            // 添加 title 属性
            title: {
                default: null,
                parseHTML: (element) => element.getAttribute('title'),
                renderHTML: (attributes) => {
                    if (!attributes.title) {
                        return {};
                    }
                    return { title: attributes.title };
                },
            },
        };
    },

    // Markdown 解析：从 token 中提取 title
    parseMarkdown: (token: any, helpers: any) => {
        const content = helpers.parseInline(token.tokens || []);
        return helpers.applyMark('link', content, {
            href: token.href || '',
            title: token.title || null,
        });
    },

    // Markdown 序列化：输出带 title 的格式
    // 注意：Marks 必须使用 helpers.renderChildren(node) 而不是 node.content
    // 这样才能正确处理相邻但不同的链接
    renderMarkdown: (node: any, helpers: any) => {
        const content = helpers.renderChildren(node);
        const href = node.attrs?.href || '';
        const title = node.attrs?.title;
        
        if (title) {
            return `[${content}](${href} "${title}")`;
        }
        return `[${content}](${href})`;
    },
});

export default CustomLink;
