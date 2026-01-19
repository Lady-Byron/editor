import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface UndoRedoButtonsAttrs {
    menuState: MenuState | null;
    disabled?: boolean;
}

/**
 * 撤销和重做按钮组
 */
export default class UndoRedoButtons extends Component<UndoRedoButtonsAttrs> {
    view() {
        const { menuState, disabled } = this.attrs;

        return (
            <div className="TiptapMenu-undoRedo ButtonGroup">
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.undo'))}>
                    <button
                        className="Button Button--icon Button--link"
                        disabled={disabled || !menuState?.canUndo()}
                        onclick={menuState?.handleUndoClick}
                    >
                        {icon('fas fa-undo')}
                    </button>
                </Tooltip>
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.redo'))}>
                    <button
                        className="Button Button--icon Button--link"
                        disabled={disabled || !menuState?.canRedo()}
                        onclick={menuState?.handleRedoClick}
                    >
                        {icon('fas fa-redo')}
                    </button>
                </Tooltip>
            </div>
        );
    }
}
