import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import Stream from 'flarum/common/utils/Stream';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface InsertLinkDropdownAttrs {
    menuState: MenuState;
    disabled?: boolean;
}

export default class InsertLinkDropdown extends Dropdown {
    private menuState!: MenuState;
    text!: Stream<string>;
    href!: Stream<string>;
    title!: Stream<string>;

    private boundOnsubmit!: (e: Event) => void;
    private boundRemove!: (e: Event) => void;
    private boundOnTextInput!: (e: Event) => void;
    private boundOnHrefInput!: (e: Event) => void;
    private boundOnTitleInput!: (e: Event) => void;

    static initAttrs(attrs: InsertLinkDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-link ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<InsertLinkDropdownAttrs>) {
        super.oninit(vnode);
        this.menuState = this.attrs.menuState;

        this.text = Stream('');
        this.href = Stream('');
        this.title = Stream('');

        this.boundOnsubmit = this.onsubmit.bind(this);
        this.boundRemove = this.remove.bind(this);
        this.boundOnTextInput = (e: Event) => this.text((e.target as HTMLInputElement).value);
        this.boundOnHrefInput = (e: Event) => this.href((e.target as HTMLInputElement).value);
        this.boundOnTitleInput = (e: Event) => this.title((e.target as HTMLInputElement).value);
    }

    oncreate(vnode: Mithril.VnodeDOM<InsertLinkDropdownAttrs>) {
        super.oncreate(vnode);

        this.$().on('shown.bs.dropdown', this.onshow.bind(this));
        this.$().on('shown.bs.dropdown', () => {
            this.$('.Dropdown-menu').find('input').first().focus().select();
        });
    }

    onremove(vnode: Mithril.VnodeDOM<InsertLinkDropdownAttrs>) {
        super.onremove(vnode);
        this.$().off('shown.bs.dropdown');
    }

    getButton(children: Mithril.Children): Mithril.Children {
        const isActive = this.menuState?.isActive('link') || false;
        const tooltip = extractText(app.translator.trans('lady-byron-editor.forum.toolbar.link'));

        return (
            <button
                className={`Dropdown-toggle Button Button--icon Button--link Button--menuDropdown ${isActive ? 'active' : ''}`}
                data-toggle="dropdown"
                disabled={this.attrs.disabled}
            >
                <Tooltip text={tooltip}>
                    <span>{icon('fas fa-link')}</span>
                </Tooltip>
            </button>
        );
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

    onshow() {
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

    fields(): Mithril.Children {
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

    onsubmit(e: Event) {
        e.preventDefault();
        this.closeDropdown();
        this.insert();
    }

    insert() {
        const isActive = this.menuState.isActive('link');
        const selectionEmpty = this.menuState.selectionEmpty();

        if (selectionEmpty && !isActive && this.text()) {
            this.menuState.insertLinkWithText(this.text(), this.href(), this.title());
        } else {
            this.menuState.setLink(this.href(), this.title());
        }

        this.resetFields();
        app.composer.editor.focus();
    }

    remove(e: Event) {
        e.preventDefault();
        this.closeDropdown();
        this.menuState.setLink('');
        this.resetFields();
        app.composer.editor.focus();
    }

    closeDropdown() {
        document.body.click();
    }

    resetFields() {
        this.text('');
        this.href('');
        this.title('');
    }
}
