import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        blankLine: {
            insertBlankLine: () => ReturnType;
        };
    }
}

// 预编译正则表达式
const LB_BLANK_REGEX = /^\[lb-blank\](?:[^\[]*)\[\/lb-blank\]/;

/**
 * BlankLine - 空白行节点
 * 
 * 用于在 Markdown 中插入真正的空白行，绕过 Markdown 对连续空行的压缩。
 * 
 * Markdown 语法: [lb-blank][/lb-blank]
 * HTML 输出: <div class="lb-blank"></div>
 */
export const BlankLine = Node.create({
    name: 'blankLine',

    group: 'block',

    atom: true,  // 原子节点，整体选中/删除

    selectable: true,

    draggable: true,

    parseHTML() {
        return [
            { tag: 'div.lb-blank' },
            { tag: 'span.lb-blank' },  // 兼容 more-format 的输出
        ];
    },

    renderHTML() {
        return ['div', { class: 'lb-blank' }];
    },

    addCommands() {
        return {
            insertBlankLine: () => ({ commands, state }) => {
                const { selection } = state;
                
                // 如果当前选中了 blankLine 节点，先移动光标到其后面
                if (selection.node?.type.name === 'blankLine') {
                    commands.setTextSelection(selection.to);
                }
                
                // 插入两个 blankLine 节点
                return commands.insertContent([
                    { type: 'blankLine' },
                    { type: 'blankLine' },
                ]);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            // Mod+Shift+Enter 插入空白行
            'Mod-Shift-Enter': () => this.editor.commands.insertBlankLine(),
        };
    },

    // Markdown token 名称
    markdownTokenName: 'lb_blank',

    // Markdown tokenizer: 识别 [lb-blank][/lb-blank]
    markdownTokenizer: {
        name: 'lb_blank',
        level: 'block',
        start: (src: string) => src.indexOf('[lb-blank]'),
        tokenize: (src: string) => {
            const match = LB_BLANK_REGEX.exec(src);
            if (!match) return undefined;
            return {
                type: 'lb_blank',
                raw: match[0],
            };
        },
    },

    // Token → Tiptap JSON
    parseMarkdown: (token: any, helpers: any) => {
        return { type: 'blankLine' };
    },

    // Tiptap JSON → Markdown
    // 每个节点输出 1 对标签
    renderMarkdown: (node: any, helpers: any) => {
        return '[lb-blank][/lb-blank]\n';
    },
});

export default BlankLine;
