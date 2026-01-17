import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';
import ItemList from 'flarum/common/utils/ItemList';
import icon from 'flarum/common/helpers/icon';
import extractText from 'flarum/common/utils/extractText';
import TiptapEditorDriver from './TiptapEditorDriver';
import TiptapToolbar from './components/TiptapToolbar';
import MenuState from './states/MenuState';
import type Mithril from 'mithril';

declare const m: Mithril.Static;

declare module 'flarum/common/components/TextEditor' {
    export default interface TextEditor {
        tiptapDriver: TiptapEditorDriver | null;
        menuState: MenuState | null;
    }
}

app.initializers.add('lady-byron/editor', () => {
    extend(TextEditor.prototype, 'buildEditorParams', function (params) {
        this.menuState = new MenuState();
        params.classNames.push('Post-body');
        params.escape = () => app.composer.close();
    });

    override(TextEditor.prototype, 'buildEditor', function (original: Function, dom: HTMLElement) {
        const driver = new TiptapEditorDriver();
        driver.build(dom, this.buildEditorParams());
        this.tiptapDriver = driver;

        if (this.menuState && driver.editor) {
            this.menuState.attachEditor(driver.editor);
        }

        return driver;
    });

    extend(TextEditor.prototype, 'toolbarItems', function (items: ItemList<Mithril.Children>) {
        if (items.has('markdown')) {
            items.remove('markdown');
        }

        items.add(
            'tiptap-toolbar',
            m(TiptapToolbar, { menuState: this.menuState, disabled: this.attrs.disabled }),
            100
        );

        // 添加 undo/redo 按钮组到最右侧
        const menuState = this.menuState;
        items.add(
            'tiptap-undo-redo',
            m('div', { className: 'TiptapMenu-undoRedo ButtonGroup' }, [
                m('button', {
                    className: 'Button Button--icon Button--link',
                    title: extractText(app.translator.trans('lady-byron-editor.forum.toolbar.undo')),
                    disabled: this.attrs.disabled || !menuState?.canUndo(),
                    onclick: (e: Event) => {
                        e.preventDefault();
                        menuState?.undo();
                    }
                }, icon('fas fa-undo')),
                m('button', {
                    className: 'Button Button--icon Button--link',
                    title: extractText(app.translator.trans('lady-byron-editor.forum.toolbar.redo')),
                    disabled: this.attrs.disabled || !menuState?.canRedo(),
                    onclick: (e: Event) => {
                        e.preventDefault();
                        menuState?.redo();
                    }
                }, icon('fas fa-redo'))
            ]),
            -100
        );
    });

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
