import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import ItemList from 'flarum/common/utils/ItemList';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

import NodeTypeDropdown from './NodeTypeDropdown';
import InsertLinkDropdown from './InsertLinkDropdown';
import HiddenItemsDropdown from './HiddenItemsDropdown';
import TableDropdown from './TableDropdown';

export interface TiptapToolbarAttrs {
    menuState: MenuState | null;
    disabled?: boolean;
}

export default class TiptapToolbar extends Component<TiptapToolbarAttrs> {
    private clickHandlers!: Map<string, (e: Event) => void>;
    private keydownHandlers!: Map<string, (e: KeyboardEvent) => void>;
    private mobileExpanded: boolean = false;

    oninit(vnode: Mithril.Vnode<TiptapToolbarAttrs>) {
        super.oninit(vnode);

        this.clickHandlers = new Map();
        this.keydownHandlers = new Map();

        const createHandlers = (key: string, action: () => void) => {
            this.clickHandlers.set(key, (e: Event) => {
                e.preventDefault();
                action();
                // 移动端：操作后自动收起
                if (this.isMobile()) {
                    this.mobileExpanded = false;
                }
            });
            this.keydownHandlers.set(key, (e: KeyboardEvent) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    action();
                    if (this.isMobile()) {
                        this.mobileExpanded = false;
                    }
                }
            });
        };

        createHandlers('bold', () => this.attrs.menuState?.toggleBold());
        createHandlers('italic', () => this.attrs.menuState?.toggleItalic());
        createHandlers('quote', () => this.attrs.menuState?.toggleBlockquote());
        createHandlers('spoiler_inline', () => this.attrs.menuState?.toggleSpoilerInline());
        createHandlers('bullet_list', () => this.attrs.menuState?.toggleBulletList());

        // 移动端折叠按钮
        this.clickHandlers.set('mobile_toggle', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.mobileExpanded = !this.mobileExpanded;
        });
    }

    view() {
        const { menuState } = this.attrs;
        if (!menuState?.editor) return null;

        return (
            <div className="TiptapMenu">
                {/* 移动端折叠按钮 */}
                {this.mobileToggleButton()}

                {/* 桌面端：正常显示按钮 */}
                <div className="TiptapMenu-buttons">
                    {this.items().toArray()}
                </div>

                {/* 移动端：展开浮空面板 */}
                {this.mobileExpanded && this.mobilePanel()}
            </div>
        );
    }

    private isMobile(): boolean {
        return window.innerWidth <= 680;
    }

    private mobileToggleButton(): Mithril.Children {
        const tooltip = extractText(
            app.translator.trans(
                this.mobileExpanded
                    ? 'lady-byron-editor.forum.toolbar.collapse'
                    : 'lady-byron-editor.forum.toolbar.expand'
            )
        );

        return (
            <Tooltip text={tooltip}>
                <button
                    className={`Button Button--icon Button--link TiptapMenu-mobileToggle ${this.mobileExpanded ? 'is-active' : ''}`}
                    onclick={this.clickHandlers.get('mobile_toggle')}
                >
                    {icon(this.mobileExpanded ? 'fas fa-times' : 'fas fa-pen')}
                </button>
            </Tooltip>
        );
    }

    private mobilePanel(): Mithril.Children {
        const { menuState, disabled } = this.attrs;
        if (!menuState) return null;

        return (
            <div className="TiptapMenu-mobilePanel">
                <div className="TiptapMenu-mobilePanel-row">
                    <NodeTypeDropdown menuState={menuState} disabled={disabled} />
                    {this.createButton('bold', 'fas fa-bold', 'bold', menuState.isActive('bold'), disabled)}
                    {this.createButton('italic', 'fas fa-italic', 'italic', menuState.isActive('italic'), disabled)}
                    {this.createButton('quote', 'fas fa-quote-left', 'quote', menuState.isActive('blockquote'), disabled)}
                    {this.createButton('spoiler_inline', 'fas fa-eye-slash', 'spoiler_inline', menuState.isActive('spoilerInline'), disabled)}
                </div>
                <div className="TiptapMenu-mobilePanel-row">
                    <InsertLinkDropdown menuState={menuState} disabled={disabled} />
                    {this.createButton('bullet_list', 'fas fa-list-ul', 'bullet_list', menuState.isActive('bulletList'), disabled)}
                    <TableDropdown menuState={menuState} disabled={disabled} />
                    <HiddenItemsDropdown menuState={menuState} disabled={disabled} />
                </div>
            </div>
        );
    }

    items(): ItemList<Mithril.Children> {
        const items = new ItemList<Mithril.Children>();
        const { menuState, disabled } = this.attrs;

        if (!menuState) return items;

        items.add('text_type',
            <NodeTypeDropdown menuState={menuState} disabled={disabled} />,
            100
        );

        items.add('bold',
            this.createButton('bold', 'fas fa-bold', 'bold', menuState.isActive('bold'), disabled),
            90
        );

        items.add('italic',
            this.createButton('italic', 'fas fa-italic', 'italic', menuState.isActive('italic'), disabled),
            80
        );

        items.add('quote',
            this.createButton('quote', 'fas fa-quote-left', 'quote', menuState.isActive('blockquote'), disabled),
            70
        );

        items.add('spoiler_inline',
            this.createButton('spoiler_inline', 'fas fa-eye-slash', 'spoiler_inline', menuState.isActive('spoilerInline'), disabled),
            65
        );

        items.add('link',
            <InsertLinkDropdown menuState={menuState} disabled={disabled} />,
            60
        );

        items.add('unordered_list',
            this.createButton('bullet_list', 'fas fa-list-ul', 'bullet_list', menuState.isActive('bulletList'), disabled),
            50
        );

        items.add('table',
            <TableDropdown menuState={menuState} disabled={disabled} />,
            40
        );

        items.add('additional_items',
            <HiddenItemsDropdown menuState={menuState} disabled={disabled} />,
            0
        );

        return items;
    }

    createButton(
        key: string,
        iconName: string,
        tooltipKey: string,
        isActive: boolean,
        disabled?: boolean
    ): Mithril.Children {
        const tooltip = extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${tooltipKey}`));

        return (
            <Tooltip text={tooltip}>
                <button
                    className={`Button Button--icon Button--link ${isActive ? 'active' : ''}`}
                    onclick={this.clickHandlers.get(key)}
                    onkeydown={this.keydownHandlers.get(key)}
                    disabled={disabled || !this.attrs.menuState?.editor}
                >
                    {icon(iconName)}
                </button>
            </Tooltip>
        );
    }
}
