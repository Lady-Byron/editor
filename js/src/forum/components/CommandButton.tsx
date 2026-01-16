import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface CommandButtonAttrs {
    menuState: MenuState;
    icon: string;
    tooltip: string | Mithril.Children;
    command: () => void;
    active?: () => boolean;
    disabled?: boolean;
}

export default class CommandButton extends Component<CommandButtonAttrs> {
    private boundOnclick!: (e: Event) => void;
    private boundOnkeydown!: (e: KeyboardEvent) => void;

    oninit(vnode: Mithril.Vnode<CommandButtonAttrs>) {
        super.oninit(vnode);
        this.boundOnclick = this.onclick.bind(this);
        this.boundOnkeydown = this.onkeydown.bind(this);
    }

    view() {
        const { menuState, icon: iconName, tooltip, active, disabled } = this.attrs;

        const isActive = active ? active() : false;
        const isDisabled = disabled || !menuState.editor;

        return (
            <Tooltip text={extractText(tooltip)}>
                <button
                    className={`Button Button--icon Button--link ${isActive ? 'active' : ''}`}
                    onclick={this.boundOnclick}
                    onkeydown={this.boundOnkeydown}
                    disabled={isDisabled}
                >
                    {icon(iconName)}
                </button>
            </Tooltip>
        );
    }

    onclick(e: Event) {
        e.preventDefault();
        this.attrs.command();
    }

    onkeydown(e: KeyboardEvent) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this.attrs.command();
        }
    }
}
