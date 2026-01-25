import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

// 32 色调色板 (4×8)
const COLOR_PRESETS: string[] = [
    // 第一行 - 灰度
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#ffffff',
    // 第二行 - 纯色
    '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
    // 第三行 - 柔和色
    '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#d9d2e9',
    // 第四行 - 深色
    '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47',
];

export default class ColorDropdown extends TiptapDropdown {
    private colorPickerHandler: ((e: Event) => void) | null = null;

    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-color ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        this.createHandlers('remove', () => {
            this.menuState.unsetTextColor();
            this.closeDropdown();
        });

        COLOR_PRESETS.forEach((color, index) => {
            this.createHandlers(`color-${index}`, () => {
                this.menuState.setTextColor(color);
                this.closeDropdown();
            });
        });
    }

    protected getIcon(): string {
        return 'fas fa-palette';
    }

    protected getTooltipKey(): string {
        return 'text_color';
    }

    protected isButtonActive(): boolean {
        return this.menuState?.isActive('textColor') || false;
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu ColorDropdownMenu">
                <div className="ColorDropdown-grid">
                    {COLOR_PRESETS.map((color, index) => (
                        <button
                            key={color}
                            className="ColorDropdown-swatch"
                            style={{ backgroundColor: color }}
                            onclick={this.clickHandlers.get(`color-${index}`)}
                            title={color}
                        />
                    ))}
                </div>
                <div className="ColorDropdown-actions">
                    <label className="ColorDropdown-picker">
                        {icon('fas fa-eye-dropper')}
                        <input
                            type="color"
                            className="ColorDropdown-pickerInput"
                            onchange={(e: Event) => {
                                const color = (e.target as HTMLInputElement).value;
                                this.menuState.setTextColor(color);
                                this.closeDropdown();
                            }}
                        />
                    </label>
                    <button
                        className="Button Button--link ColorDropdown-remove"
                        onclick={this.clickHandlers.get('remove')}
                    >
                        {icon('fas fa-times')}
                        {app.translator.trans('lady-byron-editor.forum.toolbar.remove_color')}
                    </button>
                </div>
            </ul>
        );
    }
}
