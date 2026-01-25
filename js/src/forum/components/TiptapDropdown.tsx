import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface TiptapDropdownAttrs {
    menuState: MenuState;
    disabled?: boolean;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
    accessibleToggleLabel?: string;
}

export default class TiptapDropdown<T extends TiptapDropdownAttrs = TiptapDropdownAttrs> extends Dropdown {
    protected menuState!: MenuState;
    
    protected clickHandlers: Map<string, (e: Event) => void> = new Map();
    protected keydownHandlers: Map<string, (e: KeyboardEvent) => void> = new Map();

    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.buttonClassName = attrs.buttonClassName || 'Button Button--icon Button--link Button--menuDropdown';
    }

    oninit(vnode: Mithril.Vnode<T>) {
        super.oninit(vnode);
        this.menuState = this.attrs.menuState;
    }

    oncreate(vnode: Mithril.VnodeDOM<T>) {
        super.oncreate(vnode);
        this.$().on('shown.bs.dropdown', () => {
            this.$('.Dropdown-menu').find('input, select, textarea').first().focus().select();
        });
    }

    onremove(vnode: Mithril.VnodeDOM<T>) {
        super.onremove(vnode);
        this.$().off('shown.bs.dropdown');
    }

    protected getIcon(): string {
        return '';
    }

    protected getTooltipKey(): string {
        return '';
    }

    protected isButtonActive(): boolean {
        return false;
    }

    getButtonContent(): Mithril.Children {
        const tooltipKey = this.getTooltipKey();
        const iconClass = this.getIcon();
        
        if (!tooltipKey || !iconClass) {
            return <span>{icon(iconClass)}</span>;
        }
        
        const tooltip = extractText(app.translator.trans(`lady-byron-editor.forum.toolbar.${tooltipKey}`));
        return (
            <Tooltip text={tooltip}>
                <span className={this.isButtonActive() ? 'is-active' : ''}>
                    {icon(iconClass)}
                </span>
            </Tooltip>
        );
    }

    protected closeDropdown(): void {
        document.body.click();
    }

    protected createHandlers(key: string, action: () => void): void {
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
    }

    protected onsubmit(e: Event): void {
        e.preventDefault();
        this.closeDropdown();
        this.insert();
        app.composer.editor.focus();
    }

    protected insert(): void {
        // 子类实现
    }
}
