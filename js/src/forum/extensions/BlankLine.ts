import { Node } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        blankLine: {
            insertBlankLine: () => ReturnType;
        };
    }
}

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
            insertBlankLine: () => ({ tr, dispatch, state }) => {
                const blankLineType = state.schema.nodes.blankLine;
                const node1 = blankLineType.create();
                const node2 = blankLineType.create();
                
                if (dispatch) {
                    const { selection } = state;
                    
                    if (selection.node && selection.node.type.name === 'blankLine') {
                        // 在选中的 blankLine 后面插入两个节点
                        const insertPos = selection.to;
                        tr.insert(insertPos, node1);
                        tr.insert(insertPos + node1.nodeSize, node2);
                    } else {
                        // 替换选区为第一个节点
                        const from = selection.from;
                        tr.replaceSelectionWith(node1, false);
                        
                        // 使用 mapping 获取替换后的正确位置
                        const mappedPos = tr.mapping.map(from);
                        tr.insert(mappedPos + node1.nodeSize, node2);
                    }
                    
                    // 移动光标到最后一个插入的节点之后
                    const $pos = tr.doc.resolve(Math.min(tr.selection.to, tr.doc.content.size));
                    const newSelection = Selection.near($pos, 1);
                    tr.setSelection(newSelection);
                    
                    dispatch(tr);
                }
                
                return true;
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
        start: (src: string) => {
            const idx = src.indexOf('[lb-blank]');
            return idx === -1 ? undefined : idx;
        },
        tokenize: (src: string, tokens: any[], lexer: any) => {
            // 匹配 [lb-blank][/lb-blank] 或 [lb-blank]...[/lb-blank]
            const match = /^\[lb-blank\](?:[^\[]*)\[\/lb-blank\]/.exec(src);
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
