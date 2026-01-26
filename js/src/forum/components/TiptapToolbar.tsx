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
import AlignDropdown from './AlignDropdown';
import ColorDropdown from './ColorDropdown';
import FontSizeDropdown from './FontSizeDropdown';

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

        const createHandlers = (key: string, action: () => void, autoClose: boolean = true) => {
            this.clickHandlers.set(key, (e: Event) => {
                e.preventDefault();
                action();
                if (autoClose && this.isMobile()) {
                    this.mobileExpanded = false;
                }
            });
            this.keydownHandlers.set(key, (e: KeyboardEvent) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    action();
                    if (autoClose && this.isMobile()) {
                        this.mobileExpanded = false;
                    }
                }
            });
        };

        // 主工具栏按钮
        createHandlers('bold', () => this.attrs.menuState?.toggleBold());
        createHandlers('italic', () => this.attrs.menuState?.toggleItalic());
        createHandlers('quote', () => this.attrs.menuState?.toggleBlockquote());
        createHandlers('spoiler_inline', () => this.attrs.menuState?.toggleSpoilerInline());
        createHandlers('bullet_list', () => this.attrs.menuState?.toggleBulletList());

        // 常用按钮（移动端直接显示，不自动关闭面板）
        createHandlers('blank_line', () => this.attrs.menuState?.insertBlankLine(), false);
        createHandlers('indent', () => this.attrs.menuState?.insertIndent(2), false);
        createHandlers('undo', () => this.attrs.menuState?.undo(), false);
        createHandlers('redo', () => this.attrs.menuState?.redo(), false);

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
                {/* 移动端：折叠按钮 + 常用按钮 */}
                <div className="TiptapMenu-mobile">
                    {this.mobileToggleButton()}
                    {this.mobileQuickButtons()}
                </div>

                {/* 桌面端：正常显示按钮 */}
                <div className="TiptapMenu-desktop">
                    {this.items().toArray()}
                </div>

                {/* 移动端：展开浮空面板 */}
                {this.mobileExpanded && this.mobilePanel()}
            </div>
        );
    }

    private isMobile(): boolean {
        return window.innerWidth <= 768;
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

    private mobileQuickButtons(): Mithril.Children {
        const { menuState, disabled } = this.attrs;
        if (!menuState) return null;

        return (
            <div className="TiptapMenu-mobileQuick">
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.blank_paragraph'))}>
                    <button
                        className="Button Button--icon Button--link"
                        onclick={this.clickHandlers.get('blank_line')}
                        disabled={disabled || !menuState.editor}
                    >
                        {icon('fas fa-paragraph')}
                    </button>
                </Tooltip>
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.first_line_indent'))}>
                    <button
                        className="Button Button--icon Button--link"
                        onclick={this.clickHandlers.get('indent')}
                        disabled={disabled || !menuState.editor}
                    >
                        {icon('fas fa-indent')}
                    </button>
                </Tooltip>
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.undo'))}>
                    <button
                        className="Button Button--icon Button--link"
                        onclick={this.clickHandlers.get('undo')}
                        disabled={disabled || !menuState.canUndo()}
                    >
                        {icon('fas fa-undo')}
                    </button>
                </Tooltip>
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.redo'))}>
                    <button
                        className="Button Button--icon Button--link"
                        onclick={this.clickHandlers.get('redo')}
                        disabled={disabled || !menuState.canRedo()}
                    >
                        {icon('fas fa-redo')}
                    </button>
                </Tooltip>
            </div>
        );
    }

    private mobilePanel(): Mithril.Children {
        const { menuState, disabled } = this.attrs;
        if (!menuState) return null;

        // 12个按钮直接平铺，CSS grid 自动排列成 4x3
        return (
            <div className="TiptapMenu-mobilePanel">
                <NodeTypeDropdown menuState={menuState} disabled={disabled} />
                {this.createButton('bold', 'fas fa-bold', 'bold', menuState.isActive('bold'), disabled)}
                {this.createButton('italic', 'fas fa-italic', 'italic', menuState.isActive('italic'), disabled)}
                {this.createButton('quote', 'fas fa-quote-left', 'quote', menuState.isActive('blockquote'), disabled)}
                {this.createButton('spoiler_inline', 'fas fa-eye-slash', 'spoiler_inline', menuState.isActive('spoilerInline'), disabled)}
                <InsertLinkDropdown menuState={menuState} disabled={disabled} />
                {this.createButton('bullet_list', 'fas fa-list-ul', 'bullet_list', menuState.isActive('bulletList'), disabled)}
                <TableDropdown menuState={menuState} disabled={disabled} />
                <HiddenItemsDropdown menuState={menuState} disabled={disabled} />
                <AlignDropdown menuState={menuState} disabled={disabled} />
                <FontSizeDropdown menuState={menuState} disabled={disabled} />
                <ColorDropdown menuState={menuState} disabled={disabled} />
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
