import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

// 8 档字号预设
const SIZE_PRESETS: number[] = [12, 14, 16, 18, 20, 24, 28, 36];

export default class FontSizeDropdown extends TiptapDropdown {
    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-fontSize ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        this.createHandlers('remove', () => {
            this.menuState.unsetTextSize();
            this.closeDropdown();
        });

        SIZE_PRESETS.forEach((size) => {
            this.createHandlers(`size-${size}`, () => {
                this.menuState.setTextSize(size);
                this.closeDropdown();
            });
        });
    }

    protected getIcon(): string {
        return 'fas fa-text-height';
    }

    protected getTooltipKey(): string {
        return 'font_size';
    }

    protected isButtonActive(): boolean {
        return this.menuState?.isActive('textSize') || false;
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        const currentSize = this.menuState?.getTextSizeValue();

        return (
            <ul className="Dropdown-menu dropdown-menu FontSizeDropdownMenu">
                <div className="FontSizeDropdown-grid">
                    {SIZE_PRESETS.map((size) => (
                        <button
                            key={size}
                            className={`FontSizeDropdown-option ${currentSize === size ? 'active' : ''}`}
                            onclick={this.clickHandlers.get(`size-${size}`)}
                            title={`${size}px`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <div className="FontSizeDropdown-actions">
                    <button
                        className="Button Button--link FontSizeDropdown-remove"
                        onclick={this.clickHandlers.get('remove')}
                    >
                        {icon('fas fa-times')}
                        {app.translator.trans('lady-byron-editor.forum.toolbar.remove_size')}
                    </button>
                </div>
            </ul>
        );
    }
}
