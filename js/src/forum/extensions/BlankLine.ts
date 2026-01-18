import { Node } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

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
                const node = state.schema.nodes.blankLine.create();
                
                if (dispatch) {
                    const { from } = state.selection;
                    
                    // 插入节点，替换当前选区
                    tr.replaceSelectionWith(node, false);
                    
                    // 计算新光标位置：插入位置 + 节点大小
                    const newPos = from + node.nodeSize;
                    
                    // 确保位置有效并设置光标到节点之后
                    if (newPos <= tr.doc.content.size) {
                        try {
                            const $pos = tr.doc.resolve(newPos);
                            // 检查是否是有效的文本光标位置
                            if ($pos.parent.isTextblock || $pos.parent.type.name === 'doc') {
                                tr.setSelection(TextSelection.create(tr.doc, newPos));
                            }
                        } catch (e) {
                            // 位置无效时保持默认选区
                        }
                    }
                    
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
    // 输出两对标签，形成一个完整的空白段落
    renderMarkdown: (node: any, helpers: any) => {
        return '[lb-blank][/lb-blank]\n[lb-blank][/lb-blank]\n';
    },
});

export default BlankLine;
