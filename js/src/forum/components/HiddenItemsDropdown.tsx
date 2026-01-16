import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Dropdown from 'flarum/common/components/Dropdown';
import Tooltip from 'flarum/common/components/Tooltip';
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

// 静态按钮配置
const BUTTON_CONFIGS: ButtonConfig[] = [
    { key: 'code', icon: 'fas fa-code', tooltipKey: 'code', activeCheck: 'code' },
    { key: 'ordered_list', icon: 'fas fa-list-ol', tooltipKey: 'ordered_list', activeCheck: 'orderedList' },
    { key: 'strike', icon: 'fas fa-strikethrough', tooltipKey: 'strikethrough', activeCheck: 'strike' },
    { key: 'code_block', icon: 'fas fa-terminal', tooltipKey: 'code_block', activeCheck: 'codeBlock' },
    { key: 'horizontal_rule', icon: 'fas fa-minus', tooltipKey: 'horizontal_rule' },
    { key: 'undo', icon: 'fas fa-undo', tooltipKey: 'undo' },
    { key: 'redo', icon: 'fas fa-redo', tooltipKey: 'redo' },
];

export default class HiddenItemsDropdown extends Component<HiddenItemsDropdownAttrs> {
    private clickHandlers!: Map<string, (e: Event) => void>;
    private keydownHandlers!: Map<string, (e: KeyboardEvent) => void>;

    oninit(vnode: Mithril.Vnode<HiddenItemsDropdownAttrs>) {
        super.oninit(vnode);

        // 预绑定所有处理器
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

        createHandlers('code', () => this.attrs.menuState.toggleCode());
        createHandlers('ordered_list', () => this.attrs.menuState.toggleOrderedList());
        createHandlers('strike', () => this.attrs.menuState.toggleStrike());
        createHandlers('code_block', () => this.attrs.menuState.toggleCodeBlock());
        createHandlers('horizontal_rule', () => this.attrs.menuState.insertHorizontalRule());
        createHandlers('undo', () => this.attrs.menuState.undo());
        createHandlers('redo', () => this.attrs.menuState.redo());
    }

    view() {
        const { menuState, disabled } = this.attrs;
        if (!menuState?.editor) return null;

        return (
            <Dropdown
                className="TiptapMenu-more ButtonGroup"
                buttonClassName="Button Button--icon Button--link Button--menuDropdown"
                menuClassName="HiddenItemsDropdownMenu"
                icon="fas fa-ellipsis-h"
                label=""
                disabled={disabled}
            >
                {this.buttons()}
            </Dropdown>
        );
    }

    buttons(): Mithril.Children[] {
        const { menuState, disabled } = this.attrs;

        return BUTTON_CONFIGS.map((config) => {
            const isActive = config.activeCheck ? menuState.isActive(config.activeCheck) : false;
            let isDisabled = disabled || !menuState.editor;

            // 特殊处理撤销/重做
            if (config.key === 'undo') isDisabled = isDisabled || !menuState.canUndo();
            if (config.key === 'redo') isDisabled = isDisabled || !menuState.canRedo();

            return (
                <Tooltip
                    text={extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${config.tooltipKey}`))}
                    key={config.key}
                >
                    <button
                        className={`Button Button--icon Button--link ${isActive ? 'active' : ''}`}
                        onclick={this.clickHandlers.get(config.key)}
                        onkeydown={this.keydownHandlers.get(config.key)}
                        disabled={isDisabled}
                    >
                        {icon(config.icon)}
                    </button>
                </Tooltip>
            );
        });
    }
}
