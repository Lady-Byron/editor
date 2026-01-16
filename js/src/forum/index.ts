import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';
import ItemList from 'flarum/common/utils/ItemList';
import TiptapEditorDriver from './TiptapEditorDriver';
import TiptapToolbar from './components/TiptapToolbar';
import MenuState from './states/MenuState';
import type Mithril from 'mithril';

// Mithril 全局变量
declare const m: Mithril.Static;

// 扩展 TextEditor 类型
declare module 'flarum/common/components/TextEditor' {
    export default interface TextEditor {
        tiptapDriver: TiptapEditorDriver | null;
        menuState: MenuState | null;
    }
}

app.initializers.add('lady-byron/editor', () => {
    // 在 buildEditorParams 中创建 menuState、添加 Post-body 类、设置 escape 回调
    extend(TextEditor.prototype, 'buildEditorParams', function (params) {
        this.menuState = new MenuState();
        params.classNames.push('Post-body'); // 继承 Flarum 排版样式
        params.escape = () => app.composer.close(); // ESC 关闭 composer
    });

    // 替换默认编辑器为 Tiptap
    override(TextEditor.prototype, 'buildEditor', function (original: Function, dom: HTMLElement) {
        const driver = new TiptapEditorDriver();
        driver.build(dom, this.buildEditorParams());
        this.tiptapDriver = driver;

        // 连接 menuState 和 editor
        if (this.menuState && driver.editor) {
            this.menuState.attachEditor(driver.editor);
        }

        return driver;
    });

    // 替换工具栏
    extend(TextEditor.prototype, 'toolbarItems', function (items: ItemList<Mithril.Children>) {
        if (items.has('markdown')) {
            items.remove('markdown');
        }

        // 传递 menuState 而非 state
        items.add(
            'tiptap-toolbar',
            m(TiptapToolbar, { menuState: this.menuState, disabled: this.attrs.disabled }),
            100
        );
    });

    // Cleanup
    extend(TextEditor.prototype, 'onremove', function () {
        if (this.menuState) {
            this.menuState.destroy();
            this.menuState = null;
        }
        if (this.tiptapDriver) {
            this.tiptapDriver = null;
        }
    });
});

export { TiptapEditorDriver, TiptapToolbar, MenuState };
