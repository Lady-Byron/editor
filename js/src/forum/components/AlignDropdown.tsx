import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

interface AlignOption {
    key: 'left' | 'center' | 'right';
    icon: string;
    tooltipKey: string;
}

const ALIGN_OPTIONS: AlignOption[] = [
    { key: 'left', icon: 'fas fa-align-left', tooltipKey: 'align_left' },
    { key: 'center', icon: 'fas fa-align-center', tooltipKey: 'align_center' },
    { key: 'right', icon: 'fas fa-align-right', tooltipKey: 'align_right' },
];

export default class AlignDropdown extends TiptapDropdown {
    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-align ButtonGroup';
        attrs.buttonClassName = 'Button Button--icon Button--link Button--menuDropdown';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        ALIGN_OPTIONS.forEach(({ key }) => {
            this.createHandlers(key, () => {
                this.menuState.toggleTextAlign(key);
                this.closeDropdown();
            });
        });

        this.createHandlers('unset', () => {
            this.menuState.unsetTextAlign();
            this.closeDropdown();
        });
    }

    protected getIcon(): string {
        const active = this.menuState?.getActiveAlignment();
        if (active === 'center') return 'fas fa-align-center';
        if (active === 'right') return 'fas fa-align-right';
        if (active === 'left') return 'fas fa-align-left';
        return 'fas fa-align-center';
    }

    protected getTooltipKey(): string {
        return 'text_align';
    }

    protected isButtonActive(): boolean {
        return this.menuState?.getActiveAlignment() !== null;
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu AlignDropdownMenu">
                {this.getAlignButtons()}
            </ul>
        );
    }

    private getAlignButtons(): Mithril.Children[] {
        const { disabled } = this.attrs;
        const activeAlign = this.menuState?.getActiveAlignment();
        const buttons: Mithril.Children[] = [];

        ALIGN_OPTIONS.forEach(({ key, icon: iconName, tooltipKey }) => {
            const isActive = activeAlign === key;
            const isDisabled = disabled || !this.menuState.editor;

            buttons.push(
                <button
                    className={`Button Button--icon Button--link ${isActive ? 'active' : ''}`}
                    onclick={this.clickHandlers.get(key)}
                    onkeydown={this.keydownHandlers.get(key)}
                    disabled={isDisabled}
                    title={extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${tooltipKey}`))}
                    key={key}
                >
                    {icon(iconName)}
                </button>
            );
        });

        if (activeAlign) {
            buttons.push(
                <button
                    className="Button Button--icon Button--link"
                    onclick={this.clickHandlers.get('unset')}
                    onkeydown={this.keydownHandlers.get('unset')}
                    disabled={disabled || !this.menuState.editor}
                    title={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.align_unset'))}
                    key="unset"
                >
                    {icon('fas fa-times')}
                </button>
            );
        }

        return buttons;
    }
}
