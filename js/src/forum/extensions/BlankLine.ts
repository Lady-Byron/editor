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
                    let insertPos: number;
                    
                    // 检查是否当前选中了 blankLine 节点（NodeSelection）
                    // 如果是，在其后面插入而不是替换
                    if (selection.node && selection.node.type.name === 'blankLine') {
                        insertPos = selection.to;
                        // 插入两个节点
                        tr.insert(insertPos, node1);
                        tr.insert(insertPos + node1.nodeSize, node2);
                    } else {
                        insertPos = selection.from;
                        // 用第一个节点替换选区，然后插入第二个
                        tr.replaceSelectionWith(node1, false);
                        tr.insert(insertPos + node1.nodeSize, node2);
                    }
                    
                    // 两个节点的结束位置
                    const newNodeEnd = insertPos + node1.nodeSize + node2.nodeSize;
                    
                    // 使用 Selection.near 找到合适的选区位置
                    const $pos = tr.doc.resolve(Math.min(newNodeEnd, tr.doc.content.size));
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
