import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface TiptapDropdownAttrs {
    menuState: MenuState;
    disabled?: boolean;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
    accessibleToggleLabel?: string;
}

/**
 * TiptapDropdown - Tiptap 工具栏下拉按钮基类
 * 
 * 继承自 Flarum Dropdown，提供：
 * - 统一的按钮样式和 menuState 管理
 * - 模板方法生成按钮内容 (getIcon/getTooltipKey/isButtonActive)
 * - 事件处理器创建辅助方法
 * - 下拉菜单打开时自动聚焦第一个输入框
 * - 表单提交的通用流程处理
 */
export default class TiptapDropdown<T extends TiptapDropdownAttrs = TiptapDropdownAttrs> extends Dropdown {
    protected menuState!: MenuState;
    
    // 事件处理器 Map，子类可选使用
    protected clickHandlers: Map<string, (e: Event) => void> = new Map();
    protected keydownHandlers: Map<string, (e: KeyboardEvent) => void> = new Map();

    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.buttonClassName = attrs.buttonClassName || 'Button Button--icon Button--link Button--menuDropdown';
    }

    oninit(vnode: Mithril.Vnode<T>) {
        super.oninit(vnode);
        this.menuState = this.attrs.menuState;
    }

    oncreate(vnode: Mithril.VnodeDOM<T>) {
        super.oncreate(vnode);
        // 下拉菜单打开时自动聚焦第一个输入框
        this.$().on('shown.bs.dropdown', () => {
            this.$('.Dropdown-menu').find('input, select, textarea').first().focus().select();
        });
    }

    onremove(vnode: Mithril.VnodeDOM<T>) {
        super.onremove(vnode);
        this.$().off('shown.bs.dropdown');
    }

    /**
     * 模板方法：返回按钮图标类名
     * 子类覆盖此方法指定图标
     */
    protected getIcon(): string {
        return '';
    }

    /**
     * 模板方法：返回 tooltip 的翻译 key（不含前缀）
     * 子类覆盖此方法指定 tooltip
     */
    protected getTooltipKey(): string {
        return '';
    }

    /**
     * 模板方法：返回按钮是否处于激活状态
     * 子类覆盖此方法实现动态状态
     */
    protected isButtonActive(): boolean {
        return false;
    }

    /**
     * 默认的按钮内容实现
     * 大多数子类只需覆盖 getIcon/getTooltipKey/isButtonActive
     * 特殊子类（如 NodeTypeDropdown）可完全覆盖此方法
     */
    getButtonContent(): Mithril.Children {
        const tooltipKey = this.getTooltipKey();
        const iconClass = this.getIcon();
        
        if (!tooltipKey || !iconClass) {
            return <span>{icon(iconClass)}</span>;
        }
        
        const tooltip = extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${tooltipKey}`));
        return (
            <Tooltip text={tooltip}>
                <span className={this.isButtonActive() ? 'is-active' : ''}>
                    {icon(iconClass)}
                </span>
            </Tooltip>
        );
    }

    /**
     * 关闭下拉菜单
     */
    protected closeDropdown(): void {
        document.body.click();
    }

    /**
     * 创建 click 和 keydown 事件处理器对
     * 子类可在 oninit 中调用此方法批量注册处理器
     */
    protected createHandlers(key: string, action: () => void): void {
        this.clickHandlers.set(key, (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            action();
        });
        this.keydownHandlers.set(key, (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                action();
            }
        });
    }

    /**
     * 表单提交的通用处理流程
     * 子类可覆盖 insert() 方法实现具体逻辑
     */
    protected onsubmit(e: Event): void {
        e.preventDefault();
        this.closeDropdown();
        this.insert();
        app.composer.editor.focus();
    }

    /**
     * 模板方法：执行实际的插入操作
     * 子类覆盖此方法实现具体逻辑
     */
    protected insert(): void {
        // 子类实现
    }
}
