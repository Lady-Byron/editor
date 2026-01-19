import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface FormattingButtonsAttrs {
    menuState: MenuState | null;
    disabled?: boolean;
}

/**
 * 空白段落和段首缩进按钮组
 */
export default class FormattingButtons extends Component<FormattingButtonsAttrs> {
    view() {
        const { menuState, disabled } = this.attrs;

        return (
            <div className="TiptapMenu-formatting ButtonGroup">
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.blank_paragraph'))}>
                    <button
                        className="Button Button--icon Button--link"
                        disabled={disabled || !menuState?.editor}
                        onclick={menuState?.handleBlankLineClick}
                    >
                        {icon('fas fa-paragraph')}
                    </button>
                </Tooltip>
                <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.first_line_indent'))}>
                    <button
                        className="Button Button--icon Button--link"
                        disabled={disabled || !menuState?.editor}
                        onclick={menuState?.handleIndentClick}
                    >
                        {icon('fas fa-indent')}
                    </button>
                </Tooltip>
            </div>
        );
    }
}
