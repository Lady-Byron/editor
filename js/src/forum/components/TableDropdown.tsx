import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import Button from 'flarum/common/components/Button';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import Stream from 'flarum/common/utils/Stream';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface TableDropdownAttrs {
    menuState: MenuState;
    disabled?: boolean;
}

export default class TableDropdown extends Dropdown {
    private menuState!: MenuState;
    rows!: Stream<number>;
    cols!: Stream<number>;
    withHeaderRow!: Stream<boolean>;

    private boundOnsubmit!: (e: Event) => void;
    private boundOnRowsInput!: (e: Event) => void;
    private boundOnColsInput!: (e: Event) => void;
    private boundOnHeaderChange!: (e: Event) => void;

    static initAttrs(attrs: TableDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-table ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<TableDropdownAttrs>) {
        super.oninit(vnode);
        this.menuState = this.attrs.menuState;

        this.rows = Stream(3);
        this.cols = Stream(3);
        this.withHeaderRow = Stream(true);

        this.boundOnsubmit = this.onsubmit.bind(this);
        this.boundOnRowsInput = (e: Event) => this.rows(parseInt((e.target as HTMLInputElement).value) || 3);
        this.boundOnColsInput = (e: Event) => this.cols(parseInt((e.target as HTMLInputElement).value) || 3);
        this.boundOnHeaderChange = (e: Event) => this.withHeaderRow((e.target as HTMLInputElement).checked);
    }

    getButton(children: Mithril.Children): Mithril.Children {
        const isActive = this.menuState?.isInTable() || false;
        const tooltip = extractText(app.translator.trans('lady-byron-editor.forum.toolbar.table'));

        return (
            <button
                className={`Dropdown-toggle Button Button--icon Button--link Button--menuDropdown ${isActive ? 'active' : ''}`}
                data-toggle="dropdown"
                disabled={this.attrs.disabled}
                title={tooltip}
            >
                <span>{icon('fas fa-table')}</span>
            </button>
        );
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        // 上下文感知：根据是否在表格内显示不同菜单
        if (this.menuState?.isInTable()) {
            return this.getEditMenu();
        }
        return this.getCreateMenu();
    }

    // 创建表格的表单菜单
    getCreateMenu(): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu TableDropdown-create">
                <form className="Form" onsubmit={this.boundOnsubmit}>
                    <div className="Form-group">
                        <label>{app.translator.trans('lady-byron-editor.forum.toolbar.table_rows')}</label>
                        <input
                            className="FormControl"
                            type="number"
                            min="1"
                            max="20"
                            value={this.rows()}
                            oninput={this.boundOnRowsInput}
                        />
                    </div>
                    <div className="Form-group">
                        <label>{app.translator.trans('lady-byron-editor.forum.toolbar.table_cols')}</label>
                        <input
                            className="FormControl"
                            type="number"
                            min="1"
                            max="10"
                            value={this.cols()}
                            oninput={this.boundOnColsInput}
                        />
                    </div>
                    <div className="Form-group">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={this.withHeaderRow()}
                                onchange={this.boundOnHeaderChange}
                            />
                            {app.translator.trans('lady-byron-editor.forum.toolbar.table_header_row')}
                        </label>
                    </div>
                    <div className="Form-group">
                        <Button type="submit" className="Button Button--primary Button--block">
                            {app.translator.trans('lady-byron-editor.forum.toolbar.insert_table')}
                        </Button>
                    </div>
                </form>
            </ul>
        );
    }

    // 编辑表格的操作菜单
    getEditMenu(): Mithril.Children {
        const createButton = (action: () => void, labelKey: string, iconName: string) => (
            <Button
                className="Button Button--link"
                onclick={(e: Event) => { e.preventDefault(); action(); this.closeDropdown(); }}
                icon={iconName}
            >
                {app.translator.trans(`lady-byron-editor.forum.toolbar.${labelKey}`)}
            </Button>
        );

        return (
            <ul className="Dropdown-menu dropdown-menu TableDropdown-edit">
                <li className="TableDropdown-section">
                    <span className="TableDropdown-sectionTitle">
                        {app.translator.trans('lady-byron-editor.forum.toolbar.table_rows_section')}
                    </span>
                    {createButton(() => this.menuState.addRowBefore(), 'add_row_before', 'fas fa-arrow-up')}
                    {createButton(() => this.menuState.addRowAfter(), 'add_row_after', 'fas fa-arrow-down')}
                    {createButton(() => this.menuState.deleteRow(), 'delete_row', 'fas fa-trash')}
                </li>
                <li className="Dropdown-separator"></li>
                <li className="TableDropdown-section">
                    <span className="TableDropdown-sectionTitle">
                        {app.translator.trans('lady-byron-editor.forum.toolbar.table_cols_section')}
                    </span>
                    {createButton(() => this.menuState.addColumnBefore(), 'add_col_before', 'fas fa-arrow-left')}
                    {createButton(() => this.menuState.addColumnAfter(), 'add_col_after', 'fas fa-arrow-right')}
                    {createButton(() => this.menuState.deleteColumn(), 'delete_col', 'fas fa-trash')}
                </li>
                <li className="Dropdown-separator"></li>
                <li className="TableDropdown-section">
                    {createButton(() => this.menuState.deleteTable(), 'delete_table', 'fas fa-trash-alt')}
                </li>
            </ul>
        );
    }

    onsubmit(e: Event) {
        e.preventDefault();
        this.menuState.insertTable(this.rows(), this.cols(), this.withHeaderRow());
        this.closeDropdown();
    }

    closeDropdown() {
        document.body.click();
    }
}
