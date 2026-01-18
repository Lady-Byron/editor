import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Marked } from 'marked';
import { SpoilerInline, SpoilerInlineParagraph, SpoilerBlock } from './extensions';
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { EditorDriverParams } from 'flarum/common/utils/EditorDriverInterface';

interface TiptapEditorParams extends EditorDriverParams {
  escape?: () => void;
}

/**
 * Flarum 的 Tiptap 编辑器 Driver。
 *
 * 关键修复点（斜体/粗体解析错乱）：
 * - @tiptap/markdown 内部依赖一个 Marked 实例来做 Markdown → ProseMirror 的解析。
 * - 在某些打包/运行环境下，@tiptap/markdown 拿到的那份 Marked 行为异常：
 *   例如 "*x*" 被 lexer 解析成 strong（粗体）甚至 text 为空，导致 setContent(..., { contentType: 'markdown' })
 *   产生“斜体变粗体、文字丢失”等问题（典型症状：*just italic* → ust itali）。
 * - 解决策略：用一个小探针验证当前 Marked 是否正常；若不正常，则用 `new Marked()` 创建干净实例，
 *   并迁移已注册的 marked extensions（包括 @tiptap/markdown 注册的、以及我们的 spoiler tokenizer），
 *   然后替换 editor.markdown 内部持有的 Marked 实例。
 *
 * 注意：
 * - 该替换必须发生在 setContent(初始 Markdown) 之前，否则“二次编辑/加载旧内容”仍会触发坏解析。
 * - 迁移 extensions 时不要只筛选 name（很多扩展对象/函数没有 name），直接整体迁移更稳。
 */
export default class TiptapEditorDriver implements EditorDriverInterface {
  el!: HTMLElement;
  editor: Editor | null = null;

  private params: TiptapEditorParams | null = null;
  private inputListeners: Function[] = [];
  private inputListenerTimeout: number | null = null;

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private taskItemClickHandler: ((e: MouseEvent) => void) | null = null;

  build(dom: HTMLElement, params: TiptapEditorParams): void {
    this.params = params;
    this.inputListeners = params.inputListeners || [];

    // 创建编辑器挂载节点
    this.el = document.createElement('div');
    this.el.className = ['TiptapEditor', 'FormControl', ...params.classNames].join(' ');
    dom.appendChild(this.el);

    // 初始化 Tiptap Editor
    this.editor = new Editor({
      element: this.el,
      extensions: [
        // 基础能力：段落、列表、粗体斜体、代码、引用等
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          link: { openOnClick: false },
        }),

        // Placeholder 文案
        Placeholder.configure({ placeholder: params.placeholder || '' }),

        // 任务列表（checkbox）
        TaskList.configure({
          HTMLAttributes: { class: 'task-list' },
        }),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: { class: 'task-item' },
        }),

        // 表格套件
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

        // Spoiler 扩展必须在 Markdown 之前注册：
        // - 否则 Markdown 解析阶段无法识别我们自定义的 token/语法
        SpoilerInline,
        SpoilerInlineParagraph, // 处理行首的 >!text!<，避免与 blockquote 冲突
        SpoilerBlock,

        // Markdown 扩展（固定 options，避免环境差异）
        Markdown.configure({
          markedOptions: { gfm: true, breaks: false },
        }),
      ],

      content: '',
      editable: !params.disabled,

      onUpdate: () => this.handleUpdate(),
      onSelectionUpdate: () => this.triggerInputListeners(),
      onFocus: () => this.el.classList.add('focused'),
      onBlur: () => this.el.classList.remove('focused'),

      editorProps: {
        /**
         * 禁止粘贴 base64 图片（避免帖子内容被塞入超大 data URI）
         */
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

    // ✅ 关键：在加载初始 markdown 内容之前，确保 Marked 实例是“行为正常”的
    this.ensureMarkedWorksOnce();

    // 初始化后加载 markdown 内容（不触发 onUpdate）
    if (params.value) {
      this.editor.commands.setContent(params.value, {
        contentType: 'markdown',
        emitUpdate: false,
      });
    }

    /**
     * 修复 TaskItem checkbox 点击问题：
     * - Tiptap 的 TaskItem 在某些场景下点击 label/checkbox 会被编辑器处理成光标移动/选区
     * - 这里用 capture 阶段拦截，并手动触发 change
     */
    this.taskItemClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const checkbox = target
        .closest('.task-item label')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;

      if (checkbox && (target === checkbox || target.closest('label'))) {
        e.stopImmediatePropagation();

        setTimeout(() => {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }, 0);
      }
    };
    this.el.addEventListener('mousedown', this.taskItemClickHandler, true);

    /**
     * 键盘快捷键：
     * - Ctrl/Cmd + Enter：提交
     * - Escape：调用外部 escape
     */
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

  /**
   * 检测当前 editor.markdown 使用的 Marked 是否“强调解析正常”；
   * 若不正常，则替换为一个干净的 `new Marked()` 实例，并迁移已注册的 marked extensions。
   *
   * 判定方式（行为探针）：
   * - "*x*" 必须 lexer 出 { type: 'em', text: 'x' }
   * - 如果 lexer 出 strong 或 text 为空，则说明该 Marked 实例不可靠，需要替换
   */
  private ensureMarkedWorksOnce(): void {
    if (!this.editor?.markdown) return;

    const mdManager = this.editor.markdown as any;

    // 防止重复执行（同一个 editor 生命周期只做一次）
    if (mdManager.__lb_marked_fixed) return;
    mdManager.__lb_marked_fixed = true;

    const current = mdManager.instance ?? mdManager.markedInstance;
    if (!current?.lexer) return;

    let ok = false;
    try {
      const tok = current.lexer('*x*')?.[0]?.tokens?.[0];
      ok = tok?.type === 'em' && tok?.text === 'x';
    } catch {
      ok = false;
    }

    // 当前实例正常则不处理
    if (ok) return;

    // 创建干净实例（隔离“坏 lexer / 坏 tokenizer”）
    const clean = new Marked();
    clean.setOptions({ gfm: true, breaks: false });

    // 迁移原实例上注册的 extensions（包括 spoiler tokenizer 等）
    const exts = current.defaults?.extensions;
    const merged: any[] = [];

    if (exts) {
      if (Array.isArray(exts.block)) merged.push(...exts.block);
      if (Array.isArray(exts.inline)) merged.push(...exts.inline);

      // 有些构建会把“起始定位器”也挂在 extensions 上；存在则一并迁移
      if (Array.isArray(exts.startBlock)) merged.push(...exts.startBlock);
      if (Array.isArray(exts.startInline)) merged.push(...exts.startInline);
    }

    // 尝试应用 extensions；失败则退回“纯净解析优先”
    if (merged.length) {
      try {
        clean.use({ extensions: merged });
      } catch {
        // 忽略：宁可丢失部分自定义 token，也不要让强调解析继续崩坏
      }
    }

    // 替换 editor.markdown 内部持有的实例（兼容不同字段名）
    if ('markedInstance' in mdManager) mdManager.markedInstance = clean;
    if ('instance' in mdManager) mdManager.instance = clean;
  }

  private handleUpdate(): void {
    this.params?.oninput(this.getValue());
    this.triggerInputListeners();
  }

  private triggerInputListeners(): void {
    if (this.inputListenerTimeout) clearTimeout(this.inputListenerTimeout);

    this.inputListenerTimeout = window.setTimeout(() => {
      this.inputListeners.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    }, 50);
  }

  getValue(): string {
    if (!this.editor) return '';
    return this.editor.getMarkdown();
  }

  setValue(value: string): void {
    if (!this.editor) return;

    // 保险：某些情况下 markdown manager 可能被重建/替换；setContent 前再保证一次
    this.ensureMarkedWorksOnce();

    this.editor.commands.setContent(value, {
      contentType: 'markdown',
      emitUpdate: false,
    });
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
      left: coords.left - editorRect.left + this.el.scrollLeft,
    };
  }

  focus(): void {
    this.editor?.commands.focus();
  }

  destroy(): void {
    if (this.inputListenerTimeout) clearTimeout(this.inputListenerTimeout);

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
