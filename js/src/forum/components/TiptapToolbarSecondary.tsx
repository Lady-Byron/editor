import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import ItemList from 'flarum/common/utils/ItemList';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';
import AlignDropdown from './AlignDropdown';

export interface TiptapToolbarSecondaryAttrs {
    menuState: MenuState | null;
    disabled?: boolean;
}

export default class TiptapToolbarSecondary extends Component<TiptapToolbarSecondaryAttrs> {
    private clickHandlers!: Map<string, (e: Event) => void>;

    oninit(vnode: Mithril.Vnode<TiptapToolbarSecondaryAttrs>) {
        super.oninit(vnode);

        this.clickHandlers = new Map();

        const createHandler = (key: string, action: () => void) => {
            this.clickHandlers.set(key, (e: Event) => {
                e.preventDefault();
                action();
            });
        };

        createHandler('blank_line', () => this.attrs.menuState?.insertBlankLine());
        createHandler('indent', () => this.attrs.menuState?.insertIndent(2));
        createHandler('undo', () => this.attrs.menuState?.undo());
        createHandler('redo', () => this.attrs.menuState?.redo());
    }

    view() {
        const { menuState } = this.attrs;
        if (!menuState?.editor) return null;

        return <div className="TiptapMenuSecondary">{this.items().toArray()}</div>;
    }

    items(): ItemList<Mithril.Children> {
        const items = new ItemList<Mithril.Children>();
        const { menuState, disabled } = this.attrs;

        if (!menuState) return items;

        items.add('blank_line',
            this.createButton(
                'blank_line',
                'fas fa-paragraph',
                'blank_paragraph',
                disabled || !menuState.editor
            ),
            100
        );

        items.add('indent',
            this.createButton(
                'indent',
                'fas fa-indent',
                'first_line_indent',
                disabled || !menuState.editor
            ),
            90
        );

        items.add('align',
            <AlignDropdown menuState={menuState} disabled={disabled} />,
            85
        );

        items.add('undo',
            this.createButton(
                'undo',
                'fas fa-undo',
                'undo',
                disabled || !menuState.canUndo()
            ),
            80
        );

        items.add('redo',
            this.createButton(
                'redo',
                'fas fa-redo',
                'redo',
                disabled || !menuState.canRedo()
            ),
            70
        );

        return items;
    }

    createButton(
        key: string,
        iconName: string,
        tooltipKey: string,
        isDisabled: boolean
    ): Mithril.Children {
        const tooltip = extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${tooltipKey}`));

        return (
            <Tooltip text={tooltip}>
                <button
                    className="Button Button--icon Button--link"
                    onclick={this.clickHandlers.get(key)}
                    disabled={isDisabled}
                >
                    {icon(iconName)}
                </button>
            </Tooltip>
        );
    }
}
