import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import ItemList from 'flarum/common/utils/ItemList';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface TiptapToolbarSecondaryAttrs {
    menuState: MenuState | null;
    disabled?: boolean;
}

/**
 * 辅助工具栏（右侧）
 * 包含：空白段落、段首缩进、撤销、重做
 */
export default class TiptapToolbarSecondary extends Component<TiptapToolbarSecondaryAttrs> {
    view() {
        const { menuState } = this.attrs;
        if (!menuState?.editor) return null;

        return <div className="TiptapMenuSecondary">{this.items().toArray()}</div>;
    }

    items(): ItemList<Mithril.Children> {
        const items = new ItemList<Mithril.Children>();
        const { menuState, disabled } = this.attrs;

        if (!menuState) return items;

        // 空白段落和段首缩进
        items.add('formatting',
            <div className="TiptapMenuSecondary-formatting ButtonGroup">
                {this.createButton(
                    'fas fa-paragraph',
                    'blank_paragraph',
                    menuState.handleBlankLineClick,
                    disabled
                )}
                {this.createButton(
                    'fas fa-indent',
                    'first_line_indent',
                    menuState.handleIndentClick,
                    disabled
                )}
            </div>,
            100
        );

        // 撤销和重做
        items.add('history',
            <div className="TiptapMenuSecondary-history ButtonGroup">
                {this.createButton(
                    'fas fa-undo',
                    'undo',
                    menuState.handleUndoClick,
                    disabled || !menuState.canUndo()
                )}
                {this.createButton(
                    'fas fa-redo',
                    'redo',
                    menuState.handleRedoClick,
                    disabled || !menuState.canRedo()
                )}
            </div>,
            0
        );

        return items;
    }

    createButton(
        iconName: string,
        tooltipKey: string,
        onclick: ((e: Event) => void) | undefined,
        disabled?: boolean
    ): Mithril.Children {
        const tooltip = extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${tooltipKey}`));

        return (
            <Tooltip text={tooltip}>
                <button
                    className="Button Button--icon Button--link"
                    onclick={onclick}
                    disabled={disabled || !this.attrs.menuState?.editor}
                >
                    {icon(iconName)}
                </button>
            </Tooltip>
        );
    }
}
