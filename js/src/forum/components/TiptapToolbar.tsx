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

    oninit(vnode: Mithril.Vnode<TiptapToolbarAttrs>) {
        super.oninit(vnode);

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

        createHandlers('bold', () => this.attrs.menuState?.toggleBold());
        createHandlers('italic', () => this.attrs.menuState?.toggleItalic());
        createHandlers('quote', () => this.attrs.menuState?.toggleBlockquote());
        createHandlers('bullet_list', () => this.attrs.menuState?.toggleBulletList());
    }

    view() {
        const { menuState } = this.attrs;
        if (!menuState?.editor) return null;

        return <div className="TiptapMenu">{this.items().toArray()}</div>;
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
