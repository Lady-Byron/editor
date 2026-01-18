import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        lbIndent: {
            insertIndent: (count?: number) => ReturnType;
        };
    }
}

// 预编译正则表达式
const LB_INDENT_REGEX = /^\[lb-i\]/;

/**
 * LbIndent - 空白格节点（用于缩进）
 * 
 * 用于在 Markdown 中插入真正的空格，绕过 Markdown 对连续空格的压缩。
 * 每个节点代表 1em 宽度的空格。
 * 
 * 常用方式：
 * - [lb-i][lb-i] = 首行缩进（2个空格）
 * 
 * Markdown 语法: [lb-i]
 * HTML 输出: <span class="lb-i">&nbsp;</span>
 */
export const LbIndent = Node.create({
    name: 'lbIndent',

    group: 'inline',

    inline: true,

    atom: true,  // 原子节点，整体选中/删除

    selectable: false,  // 行内空格不需要单独选中

    parseHTML() {
        return [
            { tag: 'span.lb-i' },
        ];
    },

    renderHTML() {
        // 使用不换行空格作为内容，确保有视觉宽度
        return ['span', { class: 'lb-i' }, '\u00A0'];
    },

    addCommands() {
        return {
            insertIndent: (count: number = 1) => ({ commands }) => {
                const nodes = Array(count).fill({ type: this.name });
                return commands.insertContent(nodes);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            // Tab 插入 2 个缩进（首行缩进）
            'Tab': () => {
                // 只在段落开头生效
                const { $from } = this.editor.state.selection;
                const isAtStart = $from.parentOffset === 0;
                if (isAtStart) {
                    return this.editor.commands.insertIndent(2);
                }
                return false;  // 让其他处理器接管
            },
        };
    },

    // Markdown token 名称
    markdownTokenName: 'lb_indent',

    // Markdown tokenizer: 识别 [lb-i]
    markdownTokenizer: {
        name: 'lb_indent',
        level: 'inline',
        start: (src: string) => src.indexOf('[lb-i]'),
        tokenize: (src: string) => {
            const match = LB_INDENT_REGEX.exec(src);
            if (!match) return undefined;
            return {
                type: 'lb_indent',
                raw: match[0],
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        return { type: 'lbIndent' };
    },

    // Tiptap JSON → Markdown
    renderMarkdown: (node: any, helpers: any) => {
        return '[lb-i]';
    },
});

export default LbIndent;
