import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Marked } from 'marked';
import { 
    SpoilerInline, 
    SpoilerInlineParagraph, 
    SpoilerBlock,
    SubscriptMark,
    SuperscriptMark,
    BlankLine,
    LbIndent,
    CustomLink,
    AlignedBlock,
    TextColor,
    TextSize,
} from './extensions';
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { EditorDriverParams } from 'flarum/common/utils/EditorDriverInterface';

interface TiptapEditorParams extends EditorDriverParams {
    escape?: () => void;
}

function createCleanMarkedInstance(): InstanceType<typeof Marked> {
    const marked = new Marked();
    marked.setOptions({ gfm: true, breaks: false });
    return marked;
}

// ============================================================================
// Patch 函数：修复 marked tokenizer 的 lexer 上下文问题
// 
// 问题：@tiptap/markdown 调用 tokenizer 时，传入的 lexer 没有自定义扩展，
// 或者 tokenizer 内部创建新 lexer 会污染主 lexer 的 inlineQueue。
// 
// 解决：patch 所有需要嵌套解析的 tokenizer，使用 this.lexer（主 lexer）。
// ============================================================================

/**
 * 预编译的正则表达式 - 检测自定义 inline 语法
 * 合并为单个正则以提高性能
 */
const CUSTOM_INLINE_SYNTAX_REGEX = /\[color=[^\]]+\]|\[size=\d+\]|\|\|[^|]+\|\||>![^!]+!<|\^[^\^\s]+\^|\^\([^)]+\)|~[^~\s]+~(?!~)|~\([^)]+\)/;

/**
 * 预编译的正则表达式 - 检测 block spoiler 语法
 */
const BLOCK_SPOILER_START_REGEX = /^>![^\s]/;

/**
 * 预编译的正则 - 用于 spoilerInlineParagraph 排除检查
 */
const BLOCK_SPOILER_EXCLUDE_REGEX = /^>! /;
const ORDERED_LIST_REGEX = /^\d+\.\s/;
const UNORDERED_LIST_REGEX = /^[-*+]\s/;
const TASK_LIST_REGEX = /^[-*+]\s\[[ xX]\]\s/;
const INLINE_SPOILER_CHECK_REGEX = /^>![^!]+!</;
const PIPE_SPOILER_CHECK_REGEX = /\|\|[^|]+\|\|/;

/**
 * 检查文本是否包含自定义 inline 语法
 */
function hasCustomInlineSyntax(text: string): boolean {
    return CUSTOM_INLINE_SYNTAX_REGEX.test(text);
}

/**
 * 递归处理 token 的 inline 内容
 */
function reprocessInlineTokens(token: any, lx: any): void {
    if (!token || !lx?.inlineTokens) return;

    // 处理 paragraph 和 text 类型
    if (token.type === 'paragraph' || token.type === 'text') {
        const text = token.text || token.raw?.replace(/\n$/, '');
        if (text && hasCustomInlineSyntax(text)) {
            token.tokens = lx.inlineTokens(text);
            // 新生成的 tokens 已经被主 lexer 正确解析，不需要再递归处理
            // 直接返回避免无限循环
            return;
        }
    }

    // 只对未重新解析的 tokens 递归处理子 tokens
    if (token.tokens && Array.isArray(token.tokens)) {
        token.tokens.forEach((child: any) => reprocessInlineTokens(child, lx));
    }
}

/**
 * Patch all list tokenizers (ordered, unordered, task list) to re-process 
 * custom syntax in list items.
 */
function patchAllLists(markedInstance: InstanceType<typeof Marked>): void {
    if ((markedInstance as any).__lb_patched_allLists) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    // 查找所有 list tokenizer
    const patchedIndices = new Set<number>();

    const testCases = [
        { src: '1. test', check: (r: any) => r?.type === 'list' },
        { src: '- test', check: (r: any) => r?.type === 'list' },
        { src: '- [ ] test', check: (r: any) => r?.type === 'taskList' },  // taskList 是独立的 type
    ];

    for (const testCase of testCases) {
        for (let i = 0; i < blockExt.length; i++) {
            if (patchedIndices.has(i)) continue;
            try {
                const result = blockExt[i](testCase.src);
                if (testCase.check(result)) {
                    patchedIndices.add(i);
                }
            } catch (e) {}
        }
    }

    // Patch 每个找到的 list tokenizer
    for (const idx of patchedIndices) {
        const original = blockExt[idx];

        blockExt[idx] = function(this: any, src: string, tokens?: any[], lexer?: any) {
            const result = original.call(this, src, tokens, lexer);

            // 同时处理 list 和 taskList
            if (result && (result.type === 'list' || result.type === 'taskList') && result.items) {
                const lx = this?.lexer || lexer;

                result.items.forEach((item: any) => {
                    // ============ 处理 taskItem ============
                    // taskItem 的结构不同：item.text 包含完整原始文本，
                    // 且 item.tokens 直接是 inline tokens（不包装在 paragraph 中）
                    // Tiptap 的 taskItem renderer 会自动添加 paragraph wrapper
                    if (item.type === 'taskItem') {
                        const text = item.text || item.mainContent;
                        if (text && hasCustomInlineSyntax(text) && lx?.inlineTokens) {
                            // 用主 lexer 重新解析，直接设置为 inline tokens
                            item.tokens = lx.inlineTokens(text);
                        }
                        return;
                    }

                    // ============ 处理普通 list_item ============
                    // 先获取完整的 item 文本
                    const itemText = item.text;
                    if (itemText && hasCustomInlineSyntax(itemText) && lx?.inlineTokens) {
                        // 用主 lexer 重新解析
                        const newTokens = lx.inlineTokens(itemText);
                        
                        // 更新 paragraph 的 tokens
                        if (item.tokens) {
                            for (let i = 0; i < item.tokens.length; i++) {
                                const token = item.tokens[i];
                                if (token.type === 'paragraph') {
                                    // 先处理 block 级别的 spoiler
                                    const raw = token.raw;
                                    if (raw && BLOCK_SPOILER_START_REGEX.test(raw) && lx?.blockTokens) {
                                        const reTokenized = lx.blockTokens(raw);
                                        if (reTokenized?.[0] && reTokenized[0].type !== 'paragraph') {
                                            item.tokens.splice(i, 1, ...reTokenized);
                                            continue;
                                        }
                                    }
                                    // 替换 paragraph 内的 tokens
                                    token.tokens = newTokens;
                                }
                            }
                        }
                        return;
                    }

                    // 没有自定义语法，仍然递归处理（以防嵌套）
                    if (!item.tokens) return;

                    for (let i = 0; i < item.tokens.length; i++) {
                        const token = item.tokens[i];

                        // 1. 处理 block 级别的 spoiler（原有逻辑）
                        if (token.type === 'paragraph') {
                            const raw = token.raw;
                            if (raw && BLOCK_SPOILER_START_REGEX.test(raw) && lx?.blockTokens) {
                                const reTokenized = lx.blockTokens(raw);
                                if (reTokenized?.[0] && reTokenized[0].type !== 'paragraph') {
                                    item.tokens.splice(i, 1, ...reTokenized);
                                    continue;
                                }
                            }
                        }

                        // 2. 重新处理 inline 内容
                        reprocessInlineTokens(token, lx);
                    }
                });
            }

            return result;
        };
    }

    (markedInstance as any).__lb_patched_allLists = true;
}

/**
 * Patch aligned_block tokenizer.
 */
function patchAlignedBlock(markedInstance: InstanceType<typeof Marked>): void {
    if ((markedInstance as any).__lb_patched_alignedBlock) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    let idx = -1;
    for (let i = 0; i < blockExt.length; i++) {
        try {
            const result = blockExt[i]('[center]\ntest\n[/center]');
            if (result && result.type === 'aligned_block') {
                idx = i;
                break;
            }
        } catch (e) {}
    }

    if (idx === -1) return;

    const original = blockExt[idx];
    const REGEX = /^\[(center|right)\]\n?([\s\S]*?)\[\/\1\]/;

    blockExt[idx] = function(this: any, src: string, tokens?: any[], lexer?: any) {
        const match = REGEX.exec(src);
        if (!match) return original.apply(this, arguments);

        const lx = this?.lexer || lexer;
        if (!lx?.blockTokens || !lx?.inlineTokens) {
            return original.apply(this, arguments);
        }

        const align = match[1];
        const content = match[2];
        const inner = lx.blockTokens(content);

        inner.forEach((t: any) => {
            if ((t.type === 'paragraph' || t.type === 'heading') && 
                t.text && (!t.tokens || t.tokens.length === 0)) {
                t.tokens = lx.inlineTokens(t.text);
            }
        });

        return { 
            type: 'aligned_block', 
            raw: match[0], 
            align, 
            text: content, 
            tokens: inner 
        };
    };

    (markedInstance as any).__lb_patched_alignedBlock = true;
}

/**
 * Patch spoiler_inline_paragraph tokenizer.
 */
function patchSpoilerInlineParagraph(markedInstance: InstanceType<typeof Marked>): void {
    if ((markedInstance as any).__lb_patched_spoilerInlineParagraph) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    let idx = -1;
    for (let i = 0; i < blockExt.length; i++) {
        try {
            const result = blockExt[i]('>!test!<');
            if (result && result.type === 'spoiler_inline_paragraph') {
                idx = i;
                break;
            }
        } catch (e) {}
    }

    if (idx === -1) return;

    const original = blockExt[idx];

    blockExt[idx] = function(this: any, src: string, tokens?: any[], lexer?: any) {
        const lineMatch = /^(.*?)(?:\n|$)/.exec(src);
        if (!lineMatch) return undefined;

        const raw = lineMatch[0];
        const line = raw.replace(/\n$/, '');

        // 排除 block spoiler（">! " 开头）
        if (BLOCK_SPOILER_EXCLUDE_REGEX.test(line)) return undefined;

        // 排除列表项（有序列表、无序列表、任务列表）
        if (ORDERED_LIST_REGEX.test(line)) return undefined;      // 1. item
        if (UNORDERED_LIST_REGEX.test(line)) return undefined;    // - item, * item, + item
        if (TASK_LIST_REGEX.test(line)) return undefined;         // - [ ] task

        // 必须包含 spoiler 语法（支持两种格式）
        if (!INLINE_SPOILER_CHECK_REGEX.test(line) && !PIPE_SPOILER_CHECK_REGEX.test(line)) return undefined;

        const lx = this?.lexer || lexer;
        if (!lx?.inlineTokens) return original.apply(this, arguments);

        // 切片：普通片段 vs spoiler 片段（支持两种格式）
        const mixed: any[] = [];
        const re = />!([^!]+)!<|\|\|([^|]+)\|\|/g;
        let last = 0;
        let m: RegExpExecArray | null;

        while ((m = re.exec(line)) !== null) {
            // 普通片段
            if (m.index > last) {
                mixed.push(...lx.inlineTokens(line.slice(last, m.index)));
            }

            // spoiler 片段
            const inner = m[1] ?? m[2] ?? '';
            mixed.push({
                type: 'spoiler_inline',
                raw: m[0],
                text: inner,
                tokens: lx.inlineTokens(inner),
            });

            last = m.index + m[0].length;
        }

        // 剩余普通片段
        if (last < line.length) {
            mixed.push(...lx.inlineTokens(line.slice(last)));
        }

        return {
            type: 'spoiler_inline_paragraph',
            raw,
            tokens: mixed,
        };
    };

    (markedInstance as any).__lb_patched_spoilerInlineParagraph = true;
}

/**
 * Patch spoiler_block tokenizer.
 */
function patchSpoilerBlock(markedInstance: InstanceType<typeof Marked>): void {
    if ((markedInstance as any).__lb_patched_spoilerBlock) return;

    const blockExt = markedInstance.defaults?.extensions?.block;
    if (!blockExt || !Array.isArray(blockExt)) return;

    let idx = -1;
    for (let i = 0; i < blockExt.length; i++) {
        try {
            const result = blockExt[i]('>! test');
            if (result && result.type === 'spoiler_block') {
                idx = i;
                break;
            }
        } catch (e) {}
    }

    if (idx === -1) return;

    const original = blockExt[idx];

    blockExt[idx] = function(this: any, src: string, tokens?: any[], lexer?: any) {
        const match = /^(?:>! .*(?:\n|$))+/.exec(src);
        if (!match) return undefined;

        const lx = this?.lexer || lexer;
        if (!lx?.inlineTokens) return original.apply(this, arguments);

        const rawContent = match[0];
        const lines = rawContent
            .split('\n')
            .map((line: string) => line.replace(/^>! ?/, ''))
            .filter((line: string) => line.length > 0 || rawContent.includes('\n'));

        const paragraphTokens = lines
            .filter((line: string) => line.trim().length > 0)
            .map((line: string) => ({
                type: 'paragraph',
                raw: line,
                text: line,
                tokens: lx.inlineTokens(line),
            }));

        return {
            type: 'spoiler_block',
            raw: rawContent,
            text: lines.join('\n').trim(),
            tokens: paragraphTokens,
        };
    };

    (markedInstance as any).__lb_patched_spoilerBlock = true;
}

/**
 * Patch all inline tokenizers that need nested parsing.
 */
function patchInlineTokenizers(markedInstance: InstanceType<typeof Marked>): void {
    if ((markedInstance as any).__lb_patched_inlineTokenizers) return;

    const inlineExt = markedInstance.defaults?.extensions?.inline;
    if (!inlineExt || !Array.isArray(inlineExt)) return;

    const configs: Array<{
        type: string;
        testSrc: string;
        regex: RegExp;
        getInnerText: (match: RegExpExecArray) => string;
        buildToken: (match: RegExpExecArray, innerTokens: any[]) => any;
    }> = [
        {
            type: 'text_color',
            testSrc: '[color=red]test[/color]',
            regex: /^\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/,
            getInnerText: (m) => m[2],
            buildToken: (m, tokens) => ({
                type: 'text_color',
                raw: m[0],
                color: m[1],
                text: m[2],
                tokens,
            }),
        },
        {
            type: 'text_size',
            testSrc: '[size=20]test[/size]',
            regex: /^\[size=(\d+)\]([\s\S]*?)\[\/size\]/,
            getInnerText: (m) => m[2],
            buildToken: (m, tokens) => ({
                type: 'text_size',
                raw: m[0],
                size: parseInt(m[1], 10),
                text: m[2],
                tokens,
            }),
        },
        {
            // 支持两种语法：>!text!< 和 ||text||
            type: 'spoiler_inline',
            testSrc: '>!test!<',
            regex: /^>!([^!]+)!</,
            getInnerText: (m) => m[1],
            buildToken: (m, tokens) => ({
                type: 'spoiler_inline',
                raw: m[0],
                text: m[1],
                tokens,
            }),
        },
        {
            // ||text|| 格式的 spoiler
            type: 'spoiler_inline',
            testSrc: '||test||',
            regex: /^\|\|([^|]+)\|\|/,
            getInnerText: (m) => m[1],
            buildToken: (m, tokens) => ({
                type: 'spoiler_inline',
                raw: m[0],
                text: m[1],
                tokens,
            }),
        },
        {
            type: 'subscript',
            testSrc: '~test~',
            regex: /^~\(([^)]+)\)|^~([^~\s]+)~(?!~)/,
            getInnerText: (m) => m[1] || m[2],
            buildToken: (m, tokens) => ({
                type: 'subscript',
                raw: m[0],
                text: m[1] || m[2],
                tokens,
            }),
        },
        {
            type: 'superscript',
            testSrc: '^test^',
            regex: /^\^\(([^)]+)\)|^\^([^\^\s]+)\^/,
            getInnerText: (m) => m[1] || m[2],
            buildToken: (m, tokens) => ({
                type: 'superscript',
                raw: m[0],
                text: m[1] || m[2],
                tokens,
            }),
        },
    ];

    // 记录已 patch 的 tokenizer，避免重复
    const patchedIndices = new Set<number>();

    for (const config of configs) {
        let idx = -1;
        for (let i = 0; i < inlineExt.length; i++) {
            if (patchedIndices.has(i)) continue;
            try {
                const result = inlineExt[i](config.testSrc);
                if (result && result.type === config.type) {
                    idx = i;
                    break;
                }
            } catch (e) {}
        }

        if (idx === -1) continue;

        patchedIndices.add(idx);
        const original = inlineExt[idx];

        inlineExt[idx] = function(this: any, src: string, tokens?: any[], lexer?: any) {
            const match = config.regex.exec(src);
            if (!match) return original.apply(this, arguments);

            const lx = this?.lexer || lexer;
            const innerText = config.getInnerText(match);
            const innerTokens = lx?.inlineTokens ? lx.inlineTokens(innerText) : [];

            return config.buildToken(match, innerTokens);
        };
    }

    (markedInstance as any).__lb_patched_inlineTokenizers = true;
}

/**
 * Apply all patches to the marked instance.
 */
function applyMarkedPatches(markedInstance: InstanceType<typeof Marked>): void {
    patchAllLists(markedInstance);
    patchAlignedBlock(markedInstance);
    patchSpoilerInlineParagraph(markedInstance);
    patchSpoilerBlock(markedInstance);
    patchInlineTokenizers(markedInstance);
}

/**
 * Patch markdown manager to fix node type handling bugs.
 * 
 * Bug 1: getHandlerForToken 收到 NodeType 对象而不是字符串
 * Bug 2: renderMarkdown 内部检查 node.type === 'xxx'，但 node.type 是对象
 * 
 * 解决：两处都需要 patch，确保 type 是字符串
 */
function patchMarkdownManager(editor: Editor): void {
    const manager = (editor.storage as any)?.markdown?.manager;
    if (!manager || (manager as any).__lb_patched_manager) return;

    // Patch 1: getHandlerForToken
    const originalGetHandler = manager.getHandlerForToken.bind(manager);
    manager.getHandlerForToken = function(type: any) {
        const typeName = (typeof type === 'object' && type?.name) ? type.name : type;
        return originalGetHandler(typeName);
    };

    // Patch 2: renderNodeToMarkdown - 包装节点使 type 为字符串
    const originalRenderNode = manager.renderNodeToMarkdown.bind(manager);
    manager.renderNodeToMarkdown = function(node: any, parent?: any, index?: number, level?: number) {
        if (node && node.type && typeof node.type === 'object' && node.type.name) {
            const wrapped = Object.create(node);
            wrapped.type = node.type.name;
            // 保持 content 可遍历（数组形式）
            if (node.content && node.content.content) {
                wrapped.content = node.content.content;
            }
            return originalRenderNode(wrapped, parent, index, level);
        }
        return originalRenderNode(node, parent, index, level);
    };

    (manager as any).__lb_patched_manager = true;
}

// ============================================================================
// TiptapEditorDriver
// ============================================================================

export default class TiptapEditorDriver implements EditorDriverInterface {
    el!: HTMLElement;
    editor: Editor | null = null;
    private params: TiptapEditorParams | null = null;
    private inputListeners: Function[] = [];
    private inputListenerTimeout: number | null = null;
    private oninputTimeout: number | null = null;
    private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private taskItemClickHandler: ((e: MouseEvent) => void) | null = null;

    build(dom: HTMLElement, params: TiptapEditorParams): void {
        this.params = params;
        this.inputListeners = params.inputListeners || [];

        this.el = document.createElement('div');
        this.el.className = ['TiptapEditor', 'FormControl', ...params.classNames].join(' ');
        dom.appendChild(this.el);

        this.editor = new Editor({
            element: this.el,
            extensions: [
                StarterKit.configure({
                    heading: { levels: [1, 2, 3, 4, 5, 6] },
                    link: false,
                }),
                Placeholder.configure({ placeholder: params.placeholder || '' }),
                TaskList.configure({
                    HTMLAttributes: { class: 'task-list' },
                }),
                TaskItem.configure({
                    nested: true,
                    HTMLAttributes: { class: 'task-item' },
                }),
                TableKit.configure({
                    table: {
                        resizable: false,
                        HTMLAttributes: { class: 'tiptap-table' },
                    },
                    tableRow: {
                        HTMLAttributes: { class: 'tiptap-table-row' },
                    },
                    tableCell: {
                        HTMLAttributes: { class: 'tiptap-table-cell' },
                    },
                    tableHeader: {
                        HTMLAttributes: { class: 'tiptap-table-header' },
                    },
                }),
                CustomLink.configure({ openOnClick: false }),
                SpoilerInline,
                SpoilerInlineParagraph,
                SpoilerBlock,
                SubscriptMark,
                SuperscriptMark,
                BlankLine,
                LbIndent,
                AlignedBlock,
                TextColor,
                TextSize,
                Markdown.configure({
                    marked: createCleanMarkedInstance(),
                }),
            ],
            content: '',
            editable: !params.disabled,
            onUpdate: () => this.handleUpdate(),
            onSelectionUpdate: () => this.triggerInputListeners(),
            onFocus: () => this.el.classList.add('focused'),
            onBlur: () => this.el.classList.remove('focused'),
            editorProps: {
                transformPastedHTML(html) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const dataImageRegex = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;
                    doc.querySelectorAll('img').forEach((img) => {
                        if (dataImageRegex.test(img.src)) img.remove();
                    });
                    return doc.body.innerHTML;
                },
            },
        });

        // 应用所有 marked patches
        if (this.editor.markdown?.markedInstance) {
            applyMarkedPatches(this.editor.markdown.markedInstance);
        }

        // 修复 markdown manager 的 getHandlerForToken bug
        patchMarkdownManager(this.editor);

        if (params.value) {
            this.editor.commands.setContent(params.value, {
                contentType: 'markdown',
                emitUpdate: false,
            });
        }

        this.taskItemClickHandler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const checkbox = target.closest('.task-item label')?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            if (checkbox && (target === checkbox || target.closest('label'))) {
                e.stopImmediatePropagation();
                setTimeout(() => {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }, 0);
            }
        };
        this.el.addEventListener('mousedown', this.taskItemClickHandler, true);

        this.keydownHandler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.params?.onsubmit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.params?.escape?.();
            }
        };
        this.el.addEventListener('keydown', this.keydownHandler);
    }

    private handleUpdate(): void {
        if (this.oninputTimeout) clearTimeout(this.oninputTimeout);
        this.oninputTimeout = window.setTimeout(() => {
            this.params?.oninput(this.getValue());
        }, 50);
        this.triggerInputListeners();
    }

    private triggerInputListeners(): void {
        if (this.inputListenerTimeout) clearTimeout(this.inputListenerTimeout);
        this.inputListenerTimeout = window.setTimeout(() => {
            this.inputListeners.forEach((fn) => { try { fn(); } catch (e) {} });
        }, 50);
    }

    getValue(): string {
        if (!this.editor) return '';
        let md = this.editor.getMarkdown();
        
        // 清理表格中的 &nbsp;（空单元格）
        md = md.replace(/\|\s*&nbsp;\s*(?=\|)/g, '| ');
        
        // 清理末尾的 &nbsp;（trailingNode 产生的空段落）
        md = md.replace(/\n*&nbsp;\s*$/, '');
        
        // 清理首尾空白
        md = md.trim();
        
        return md;
    }

    setValue(value: string): void {
        if (!this.editor) return;
        this.editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
    }

    getSelectionRange(): Array<number> {
        if (!this.editor) return [0, 0];
        const { from, to } = this.editor.state.selection;
        return [from, to];
    }

    moveCursorTo(position: number): void {
        this.editor?.commands.setTextSelection(position);
    }

    insertAtCursor(text: string, escape: boolean = false): void {
        if (!this.editor) return;
        if (escape) {
            const { from, to } = this.editor.state.selection;
            this.editor.view.dispatch(this.editor.state.tr.insertText(text, from, to));
        } else {
            this.editor.commands.insertContent(text);
        }
    }

    insertAt(pos: number, text: string, escape: boolean = false): void {
        this.insertBetween(pos, pos, text, escape);
    }

    insertBetween(start: number, end: number, text: string, escape: boolean = false): void {
        if (!this.editor) return;
        if (escape) {
            this.editor.view.dispatch(this.editor.state.tr.insertText(text, start, end));
        } else {
            this.editor.chain().focus().insertContentAt({ from: start, to: end }, text).run();
        }
    }

    replaceBeforeCursor(start: number, text: string, escape: boolean = false): void {
        const [cursorPos] = this.getSelectionRange();
        this.insertBetween(start, cursorPos, text, escape);
    }

    getLastNChars(n: number): string {
        if (!this.editor) return '';
        const { $from } = this.editor.state.selection;
        const nodeBefore = $from.nodeBefore;
        if (!nodeBefore || !nodeBefore.text) return '';
        return nodeBefore.text.slice(Math.max(0, nodeBefore.text.length - n));
    }

    getCaretCoordinates(position?: number): { left: number; top: number } {
        if (!this.editor?.view) return { top: 0, left: 0 };
        const pos = position ?? this.editor.state.selection.from;
        const coords = this.editor.view.coordsAtPos(pos);
        const editorRect = this.el.getBoundingClientRect();
        return {
            top: coords.top - editorRect.top + this.el.scrollTop,
            left: coords.left - editorRect.left + this.el.scrollLeft
        };
    }

    focus(): void {
        this.editor?.commands.focus();
    }

    destroy(): void {
        if (this.inputListenerTimeout) clearTimeout(this.inputListenerTimeout);
        if (this.oninputTimeout) clearTimeout(this.oninputTimeout);
        if (this.keydownHandler) {
            this.el.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        if (this.taskItemClickHandler) {
            this.el.removeEventListener('mousedown', this.taskItemClickHandler, true);
            this.taskItemClickHandler = null;
        }
        this.editor?.destroy();
        this.editor = null;
        this.el?.parentNode?.removeChild(this.el);
    }

    disabled(isDisabled: boolean): void {
        this.editor?.setEditable(!isDisabled);
        this.el.classList.toggle('disabled', isDisabled);
    }
}
