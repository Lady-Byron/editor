import app from 'flarum/forum/app';
import Button from 'flarum/common/components/Button';
import Stream from 'flarum/common/utils/Stream';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

export default class TableDropdown extends TiptapDropdown {
    rows!: Stream<number>;
    cols!: Stream<number>;
    withHeaderRow!: Stream<boolean>;

    private boundOnsubmit!: (e: Event) => void;
    private boundOnRowsInput!: (e: Event) => void;
    private boundOnColsInput!: (e: Event) => void;
    private boundOnHeaderChange!: (e: Event) => void;

    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-table ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        this.rows = Stream(3);
        this.cols = Stream(3);
        this.withHeaderRow = Stream(true);

        this.boundOnsubmit = this.onsubmit.bind(this);
        this.boundOnRowsInput = (e: Event) => this.rows(parseInt((e.target as HTMLInputElement).value) || 3);
        this.boundOnColsInput = (e: Event) => this.cols(Math.max(2, parseInt((e.target as HTMLInputElement).value) || 2));
        this.boundOnHeaderChange = (e: Event) => this.withHeaderRow((e.target as HTMLInputElement).checked);
    }

    protected getIcon(): string {
        return 'fas fa-table';
    }

    protected getTooltipKey(): string {
        return 'table';
    }

    protected isButtonActive(): boolean {
        return this.menuState?.isInTable() || false;
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        if (this.menuState?.isInTable()) {
            return this.getEditMenu();
        }
        return this.getCreateMenu();
    }

    private getCreateMenu(): Mithril.Children {
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
                            min="2"
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

    private getEditMenu(): Mithril.Children {
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

    protected insert(): void {
        this.menuState.insertTable(this.rows(), this.cols(), this.withHeaderRow());
    }
}
