import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
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

export default class InsertLinkDropdown extends Component<InsertLinkDropdownAttrs> {
    text!: Stream<string>;
    href!: Stream<string>;
    title!: Stream<string>;

    private boundOnsubmit!: (e: Event) => void;
    private boundRemove!: (e: Event) => void;
    private boundOnTextInput!: (e: Event) => void;
    private boundOnHrefInput!: (e: Event) => void;
    private boundOnTitleInput!: (e: Event) => void;

    oninit(vnode: Mithril.Vnode<InsertLinkDropdownAttrs>) {
        super.oninit(vnode);

        this.text = Stream('');
        this.href = Stream('');
        this.title = Stream('');

        // 预绑定事件处理器
        this.boundOnsubmit = this.onsubmit.bind(this);
        this.boundRemove = this.remove.bind(this);
        this.boundOnTextInput = (e: Event) => this.text((e.target as HTMLInputElement).value);
        this.boundOnHrefInput = (e: Event) => this.href((e.target as HTMLInputElement).value);
        this.boundOnTitleInput = (e: Event) => this.title((e.target as HTMLInputElement).value);
    }

    oncreate(vnode: Mithril.VnodeDOM<InsertLinkDropdownAttrs>) {
        super.oncreate(vnode);

        // 使用 Bootstrap dropdown 事件监听
        this.$().on('shown.bs.dropdown', this.onshow.bind(this));
        this.$().on('shown.bs.dropdown', () => {
            // 聚焦第一个输入框
            this.$('.Dropdown-menu').find('input').first().focus().select();
        });
    }

    onremove(vnode: Mithril.VnodeDOM<InsertLinkDropdownAttrs>) {
        super.onremove(vnode);
        this.$().off('shown.bs.dropdown');
    }

    view() {
        const { menuState, disabled } = this.attrs;
        if (!menuState?.editor) return null;

        const isActive = menuState.isActive('link');

        return (
            <Dropdown
                className="TiptapMenu-link ButtonGroup"
                buttonClassName={`Button Button--icon Button--link Button--menuDropdown ${isActive ? 'active' : ''}`}
                menuClassName="Dropdown-menu dropdown-menu FormDropdown"
                icon="fas fa-link"
                label=""
                disabled={disabled}
            >
                <form className="Form" onsubmit={this.boundOnsubmit}>
                    {this.fields()}
                </form>
            </Dropdown>
        );
    }

    onshow() {
        const { menuState } = this.attrs;

        // 填充现有链接属性
        if (menuState.isActive('link')) {
            const attrs = menuState.getLinkAttributes();
            this.href(attrs.href);
            this.title(attrs.title);
            this.text('');
        } else {
            this.href('');
            this.title('');
            this.text(menuState.getSelectedText());
        }
    }

    fields(): Mithril.Children {
        const { menuState } = this.attrs;
        const isActive = menuState.isActive('link');
        const selectionEmpty = menuState.selectionEmpty();

        return (
            <div>
                {/* 文本输入框（选区为空且非编辑模式时显示） */}
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

                {/* URL 输入框 */}
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

                {/* 标题输入框 */}
                <div className="Form-group">
                    <input
                        className="FormControl"
                        name="title"
                        placeholder={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.link_title_placeholder'))}
                        value={this.title()}
                        oninput={this.boundOnTitleInput}
                    />
                </div>

                {/* 按钮 */}
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
        const { menuState } = this.attrs;
        const isActive = menuState.isActive('link');
        const selectionEmpty = menuState.selectionEmpty();

        if (selectionEmpty && !isActive && this.text()) {
            // 插入新链接文字
            menuState.insertLinkWithText(this.text(), this.href(), this.title());
        } else {
            // 更新现有选区/链接
            menuState.setLink(this.href(), this.title());
        }

        this.resetFields();
        app.composer.editor.focus();
    }

    remove(e: Event) {
        e.preventDefault();
        this.closeDropdown();
        this.attrs.menuState.setLink('');
        this.resetFields();
        app.composer.editor.focus();
    }

    closeDropdown() {
        // 触发 body click 关闭下拉菜单
        document.body.click();
    }

    resetFields() {
        this.text('');
        this.href('');
        this.title('');
    }
}
