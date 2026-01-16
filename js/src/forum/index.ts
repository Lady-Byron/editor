import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';
import ItemList from 'flarum/common/utils/ItemList';
import TiptapEditorDriver from './TiptapEditorDriver';
import TiptapToolbar from './components/TiptapToolbar';
import type Mithril from 'mithril';

// Mithril 全局变量
declare const m: Mithril.Static;

// 扩展 TextEditor 类型以包含 tiptapDriver 属性
declare module 'flarum/common/components/TextEditor' {
    export default interface TextEditor {
        tiptapDriver: TiptapEditorDriver | null;
    }
}

app.initializers.add('lady-byron/editor', () => {
    // Replace default editor with Tiptap
    // driver 绑定到 TextEditor 实例上，而不是全局变量
    override(TextEditor.prototype, 'buildEditor', function (original: Function, dom: HTMLElement) {
        const driver = new TiptapEditorDriver();
        driver.build(dom, this.buildEditorParams());
        // 将 driver 绑定到当前 TextEditor 实例
        this.tiptapDriver = driver;
        return driver;
    });

    // Add WYSIWYG toolbar
    extend(TextEditor.prototype, 'toolbarItems', function (items: ItemList<Mithril.Children>) {
        // 从当前实例获取 driver，而不是全局变量
        items.add(
            'tiptap-toolbar',
            m(TiptapToolbar, { driver: this.tiptapDriver, disabled: this.attrs.disabled }),
            1000
        );
    });

    // Cleanup - 清理当前实例的 driver
    extend(TextEditor.prototype, 'onremove', function () {
        if (this.tiptapDriver) {
            this.tiptapDriver = null;
        }
    });
});

export { TiptapEditorDriver, TiptapToolbar };
