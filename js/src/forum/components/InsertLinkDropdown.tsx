import app from 'flarum/forum/app';
import Button from 'flarum/common/components/Button';
import extractText from 'flarum/common/utils/extractText';
import Stream from 'flarum/common/utils/Stream';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

export default class InsertLinkDropdown extends TiptapDropdown {
    text!: Stream<string>;
    href!: Stream<string>;
    title!: Stream<string>;

    private boundOnsubmit!: (e: Event) => void;
    private boundRemove!: (e: Event) => void;
    private boundOnTextInput!: (e: Event) => void;
    private boundOnHrefInput!: (e: Event) => void;
    private boundOnTitleInput!: (e: Event) => void;

    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-link ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        this.text = Stream('');
        this.href = Stream('');
        this.title = Stream('');

        this.boundOnsubmit = this.onsubmit.bind(this);
        this.boundRemove = this.remove.bind(this);
        this.boundOnTextInput = (e: Event) => this.text((e.target as HTMLInputElement).value);
        this.boundOnHrefInput = (e: Event) => this.href((e.target as HTMLInputElement).value);
        this.boundOnTitleInput = (e: Event) => this.title((e.target as HTMLInputElement).value);
    }

    oncreate(vnode: Mithril.VnodeDOM<TiptapDropdownAttrs>) {
        super.oncreate(vnode);
        this.$().on('shown.bs.dropdown', this.onshow.bind(this));
    }

    protected getIcon(): string {
        return 'fas fa-link';
    }

    protected getTooltipKey(): string {
        return 'link';
    }

    protected isButtonActive(): boolean {
        return this.menuState?.isActive('link') || false;
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu FormDropdown">
                <form className="Form" onsubmit={this.boundOnsubmit}>
                    {this.fields()}
                </form>
            </ul>
        );
    }

    private onshow(): void {
        if (this.menuState.isActive('link')) {
            const attrs = this.menuState.getLinkAttributes();
            this.href(attrs.href);
            this.title(attrs.title);
            this.text('');
        } else {
            this.href('');
            this.title('');
            this.text(this.menuState.getSelectedText());
        }
    }

    private fields(): Mithril.Children {
        const isActive = this.menuState.isActive('link');
        const selectionEmpty = this.menuState.selectionEmpty();

        return (
            <div>
                {selectionEmpty && !isActive && (
                    <div className="Form-group">
                        <input
                            className="FormControl"
                            name="text"
                            placeholder={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.link_text_placeholder'))}
                            value={this.text()}
                            oninput={this.boundOnTextInput}
                            required
                        />
                    </div>
                )}

                <div className="Form-group">
                    <input
                        className="FormControl"
                        name="href"
                        type="url"
                        placeholder={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.link_url_placeholder'))}
                        value={this.href()}
                        oninput={this.boundOnHrefInput}
                        required
                    />
                </div>

                <div className="Form-group">
                    <input
                        className="FormControl"
                        name="title"
                        placeholder={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.link_title_placeholder'))}
                        value={this.title()}
                        oninput={this.boundOnTitleInput}
                    />
                </div>

                <div className="Form-group">
                    <Button type="submit" className="Button Button--primary">
                        {app.translator.trans('lady-byron-editor.forum.toolbar.insert_button')}
                    </Button>
                    {isActive && (
                        <Button className="Button Button--danger" onclick={this.boundRemove}>
                            {app.translator.trans('lady-byron-editor.forum.toolbar.remove_link_button')}
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    protected insert(): void {
        const isActive = this.menuState.isActive('link');
        const selectionEmpty = this.menuState.selectionEmpty();

        if (selectionEmpty && !isActive && this.text()) {
            this.menuState.insertLinkWithText(this.text(), this.href(), this.title());
        } else {
            this.menuState.setLink(this.href(), this.title());
        }

        this.resetFields();
    }

    private remove(e: Event): void {
        e.preventDefault();
        this.closeDropdown();
        this.menuState.setLink('');
        this.resetFields();
        app.composer.editor.focus();
    }

    private resetFields(): void {
        this.text('');
        this.href('');
        this.title('');
    }
}
