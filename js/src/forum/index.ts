import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';
import ItemList from 'flarum/common/utils/ItemList';
import TiptapEditorDriver from './TiptapEditorDriver';
import TiptapToolbar from './components/TiptapToolbar';
import type Mithril from 'mithril';

app.initializers.add('lady-byron/editor', () => {
    let currentDriver: TiptapEditorDriver | null = null;

    // Replace default editor with Tiptap
    override(TextEditor.prototype, 'buildEditor', function (original: Function, dom: HTMLElement) {
        const driver = new TiptapEditorDriver();
        driver.build(dom, this.buildEditorParams());
        currentDriver = driver;
        return driver;
    });

    // Add WYSIWYG toolbar
    extend(TextEditor.prototype, 'toolbarItems', function (items: ItemList<Mithril.Children>) {
        // currentDriver 在 buildEditor 之后才有值
        // toolbar 组件内部会处理 null 情况
        items.add(
            'tiptap-toolbar',
            <TiptapToolbar driver={currentDriver} disabled={this.attrs.disabled} />,
            1000
        );
    });

    // Cleanup
    extend(TextEditor.prototype, 'onremove', function () {
        currentDriver = null;
    });
});

export { TiptapEditorDriver, TiptapToolbar };
