import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

interface ButtonConfig {
    key: string;
    icon: string;
    tooltipKey: string;
    activeCheck?: string;
}

const BUTTON_CONFIGS: ButtonConfig[] = [
    { key: 'ordered_list', icon: 'fas fa-list-ol', tooltipKey: 'ordered_list', activeCheck: 'orderedList' },
    { key: 'task_list', icon: 'fas fa-tasks', tooltipKey: 'task_list', activeCheck: 'taskList' },
    { key: 'code', icon: 'fas fa-code', tooltipKey: 'code', activeCheck: 'code' },
    { key: 'strike', icon: 'fas fa-strikethrough', tooltipKey: 'strikethrough', activeCheck: 'strike' },
    { key: 'superscript', icon: 'fas fa-superscript', tooltipKey: 'superscript', activeCheck: 'superscript' },
    { key: 'subscript', icon: 'fas fa-subscript', tooltipKey: 'subscript', activeCheck: 'subscript' },
    { key: 'code_block', icon: 'fas fa-terminal', tooltipKey: 'code_block', activeCheck: 'codeBlock' },
    { key: 'spoiler_block', icon: 'fas fa-caret-square-right', tooltipKey: 'spoiler_block', activeCheck: 'spoilerBlock' },
    { key: 'horizontal_rule', icon: 'fas fa-minus', tooltipKey: 'horizontal_rule' },
];

export default class HiddenItemsDropdown extends TiptapDropdown {
    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-more ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        // 注册所有按钮的处理器
        this.createHandlers('ordered_list', () => this.menuState.toggleOrderedList());
        this.createHandlers('task_list', () => this.menuState.toggleTaskList());
        this.createHandlers('code', () => this.menuState.toggleCode());
        this.createHandlers('strike', () => this.menuState.toggleStrike());
        this.createHandlers('superscript', () => this.menuState.toggleSuperscript());
        this.createHandlers('subscript', () => this.menuState.toggleSubscript());
        this.createHandlers('code_block', () => this.menuState.toggleCodeBlock());
        this.createHandlers('spoiler_block', () => this.menuState.toggleSpoilerBlock());
        this.createHandlers('horizontal_rule', () => this.menuState.insertHorizontalRule());
    }

    protected getIcon(): string {
        return 'fas fa-ellipsis-h';
    }

    protected getTooltipKey(): string {
        return 'more';
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu HiddenItemsDropdownMenu">
                {this.buttons()}
            </ul>
        );
    }

    private buttons(): Mithril.Children[] {
        const { disabled } = this.attrs;

        return BUTTON_CONFIGS.map((config) => {
            const isActive = config.activeCheck ? this.menuState.isActive(config.activeCheck) : false;
            const isDisabled = disabled || !this.menuState.editor;

            return (
                <button
                    className={`Button Button--icon Button--link ${isActive ? 'active' : ''}`}
                    onclick={this.clickHandlers.get(config.key)}
                    onkeydown={this.keydownHandlers.get(config.key)}
                    disabled={isDisabled}
                    title={extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${config.tooltipKey}`))}
                    key={config.key}
                >
                    {icon(config.icon)}
                </button>
            );
        });
    }
}
