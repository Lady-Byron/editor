import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface HiddenItemsDropdownAttrs {
    menuState: MenuState;
    disabled?: boolean;
}

interface ButtonConfig {
    key: string;
    icon: string;
    tooltipKey: string;
    activeCheck?: string;
}

const BUTTON_CONFIGS: ButtonConfig[] = [
    { key: 'code', icon: 'fas fa-code', tooltipKey: 'code', activeCheck: 'code' },
    { key: 'ordered_list', icon: 'fas fa-list-ol', tooltipKey: 'ordered_list', activeCheck: 'orderedList' },
    { key: 'task_list', icon: 'fas fa-tasks', tooltipKey: 'task_list', activeCheck: 'taskList' },
    { key: 'strike', icon: 'fas fa-strikethrough', tooltipKey: 'strikethrough', activeCheck: 'strike' },
    { key: 'code_block', icon: 'fas fa-terminal', tooltipKey: 'code_block', activeCheck: 'codeBlock' },
    { key: 'spoiler_block', icon: 'fas fa-caret-square-right', tooltipKey: 'spoiler_block', activeCheck: 'spoilerBlock' },
    { key: 'horizontal_rule', icon: 'fas fa-minus', tooltipKey: 'horizontal_rule' },
];

export default class HiddenItemsDropdown extends Dropdown {
    private menuState!: MenuState;
    private clickHandlers!: Map<string, (e: Event) => void>;
    private keydownHandlers!: Map<string, (e: KeyboardEvent) => void>;

    static initAttrs(attrs: HiddenItemsDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-more ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<HiddenItemsDropdownAttrs>) {
        super.oninit(vnode);
        this.menuState = this.attrs.menuState;

        this.clickHandlers = new Map();
        this.keydownHandlers = new Map();

        const createHandlers = (key: string, action: () => void) => {
            this.clickHandlers.set(key, (e: Event) => {
                e.preventDefault();
                action();
            });
            this.keydownHandlers.set(key, (e: KeyboardEvent) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    action();
                }
            });
        };

        createHandlers('code', () => this.menuState.toggleCode());
        createHandlers('ordered_list', () => this.menuState.toggleOrderedList());
        createHandlers('task_list', () => this.menuState.toggleTaskList());
        createHandlers('strike', () => this.menuState.toggleStrike());
        createHandlers('code_block', () => this.menuState.toggleCodeBlock());
        createHandlers('spoiler_block', () => this.menuState.toggleSpoilerBlock());
        createHandlers('horizontal_rule', () => this.menuState.insertHorizontalRule());
    }

    getButton(children: Mithril.Children): Mithril.Children {
        const tooltip = extractText(app.translator.trans('lady-byron-editor.forum.toolbar.more'));

        return (
            <button
                className="Dropdown-toggle Button Button--icon Button--link Button--menuDropdown"
                data-toggle="dropdown"
                disabled={this.attrs.disabled}
                title={tooltip}
            >
                <span>{icon('fas fa-ellipsis-h')}</span>
            </button>
        );
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu HiddenItemsDropdownMenu">
                {this.buttons()}
            </ul>
        );
    }

    buttons(): Mithril.Children[] {
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
