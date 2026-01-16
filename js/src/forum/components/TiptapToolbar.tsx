import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Dropdown from 'flarum/common/components/Dropdown';
import Separator from 'flarum/common/components/Separator';
import ItemList from 'flarum/common/utils/ItemList';
import type TiptapEditorDriver from '../TiptapEditorDriver';
import type Mithril from 'mithril';

// Mithril 全局变量
declare const m: Mithril.Static;

interface TiptapToolbarAttrs {
    driver: TiptapEditorDriver | null;
    disabled?: boolean;
}

/**
 * TiptapToolbar - WYSIWYG formatting toolbar for Tiptap editor
 */
export default class TiptapToolbar extends Component<TiptapToolbarAttrs> {
    private boundRedraw: (() => void) | null = null;
    private listenersAttached = false;
    private redrawTimeout: number | null = null;

    oncreate(vnode: Mithril.VnodeDOM<TiptapToolbarAttrs>) {
        super.oncreate(vnode);
        this.tryAttachListeners();
    }

    onupdate(vnode: Mithril.VnodeDOM<TiptapToolbarAttrs>) {
        super.onupdate(vnode);
        // 首次渲染时 driver 可能为 null，在 update 时重试
        this.tryAttachListeners();
    }

    private tryAttachListeners(): void {
        if (this.listenersAttached) return;
        
        const driver = this.attrs.driver;
        if (driver?.editor) {
            // 防抖重绘，避免 selectionUpdate 和 update 同时触发导致双重重绘
            this.boundRedraw = () => {
                if (this.redrawTimeout) clearTimeout(this.redrawTimeout);
                this.redrawTimeout = window.setTimeout(() => m.redraw(), 16);
            };
            // 监听 selectionUpdate 更新格式按钮状态
            // 监听 update 更新撤销/重做按钮状态
            driver.editor.on('selectionUpdate', this.boundRedraw);
            driver.editor.on('update', this.boundRedraw);
            this.listenersAttached = true;
        }
    }

    onremove(vnode: Mithril.VnodeDOM<TiptapToolbarAttrs>) {
        super.onremove(vnode);
        if (this.redrawTimeout) clearTimeout(this.redrawTimeout);
        const driver = this.attrs.driver;
        if (driver?.editor && this.boundRedraw) {
            driver.editor.off('selectionUpdate', this.boundRedraw);
            driver.editor.off('update', this.boundRedraw);
        }
    }

    get driver(): TiptapEditorDriver | null {
        return this.attrs.driver;
    }

    view() {
        const driver = this.driver;
        if (!driver) return null;
        
        const disabled = this.attrs.disabled || false;

        return (
            <div className="TiptapToolbar ButtonGroup">
                {this.items(driver).toArray()}
            </div>
        );
    }

    /**
     * Build toolbar items
     */
    items(driver: TiptapEditorDriver): ItemList<Mithril.Children> {
        const items = new ItemList<Mithril.Children>();
        const disabled = this.attrs.disabled || false;

        // Heading dropdown
        items.add('heading', this.headingDropdown(driver, disabled), 100);

        items.add('separator1', <Separator />, 95);

        // Text formatting
        items.add('bold', this.formatButton(driver, 'bold', 'fas fa-bold', app.translator.trans('lady-byron-editor.forum.toolbar.bold'), () => driver.toggleBold(), disabled), 90);
        items.add('italic', this.formatButton(driver, 'italic', 'fas fa-italic', app.translator.trans('lady-byron-editor.forum.toolbar.italic'), () => driver.toggleItalic(), disabled), 85);
        items.add('underline', this.formatButton(driver, 'underline', 'fas fa-underline', app.translator.trans('lady-byron-editor.forum.toolbar.underline'), () => driver.toggleUnderline(), disabled), 80);
        items.add('strike', this.formatButton(driver, 'strike', 'fas fa-strikethrough', app.translator.trans('lady-byron-editor.forum.toolbar.strikethrough'), () => driver.toggleStrike(), disabled), 75);

        items.add('separator2', <Separator />, 70);

        // Code
        items.add('code', this.formatButton(driver, 'code', 'fas fa-code', app.translator.trans('lady-byron-editor.forum.toolbar.code'), () => driver.toggleCode(), disabled), 65);
        items.add('codeBlock', this.formatButton(driver, 'codeBlock', 'fas fa-file-code', app.translator.trans('lady-byron-editor.forum.toolbar.code_block'), () => driver.toggleCodeBlock(), disabled), 60);

        items.add('separator3', <Separator />, 55);

        // Lists
        items.add('bulletList', this.formatButton(driver, 'bulletList', 'fas fa-list-ul', app.translator.trans('lady-byron-editor.forum.toolbar.bullet_list'), () => driver.toggleBulletList(), disabled), 50);
        items.add('orderedList', this.formatButton(driver, 'orderedList', 'fas fa-list-ol', app.translator.trans('lady-byron-editor.forum.toolbar.ordered_list'), () => driver.toggleOrderedList(), disabled), 45);
        items.add('blockquote', this.formatButton(driver, 'blockquote', 'fas fa-quote-left', app.translator.trans('lady-byron-editor.forum.toolbar.quote'), () => driver.toggleBlockquote(), disabled), 40);

        items.add('separator4', <Separator />, 35);

        // Insert
        items.add('link', this.linkButton(driver, disabled), 30);
        items.add('image', this.imageButton(driver, disabled), 25);
        items.add('hr', this.formatButton(driver, null, 'fas fa-minus', app.translator.trans('lady-byron-editor.forum.toolbar.horizontal_rule'), () => driver.insertHorizontalRule(), disabled), 20);

        items.add('separator5', <Separator />, 15);

        // History
        items.add('undo', (
            <Button
                className="Button Button--icon"
                icon="fas fa-undo"
                title={app.translator.trans('lady-byron-editor.forum.toolbar.undo')}
                onclick={() => driver.undo()}
                disabled={disabled || !driver.canUndo()}
            />
        ), 10);
        
        items.add('redo', (
            <Button
                className="Button Button--icon"
                icon="fas fa-redo"
                title={app.translator.trans('lady-byron-editor.forum.toolbar.redo')}
                onclick={() => driver.redo()}
                disabled={disabled || !driver.canRedo()}
            />
        ), 5);

        return items;
    }

    /**
     * Create heading dropdown
     */
    private headingDropdown(driver: TiptapEditorDriver, disabled: boolean): Mithril.Children {
        const headings = [
            { level: 1 as const, label: 'H1' },
            { level: 2 as const, label: 'H2' },
            { level: 3 as const, label: 'H3' },
            { level: 4 as const, label: 'H4' },
            { level: 5 as const, label: 'H5' },
            { level: 6 as const, label: 'H6' },
        ];

        const activeHeading = headings.find(h => driver.isActive('heading', { level: h.level }));
        const buttonLabel = activeHeading ? activeHeading.label : app.translator.trans('lady-byron-editor.forum.toolbar.paragraph');

        return (
            <Dropdown
                buttonClassName="Button"
                label={buttonLabel}
                disabled={disabled}
            >
                <Button
                    className={!activeHeading ? 'active' : ''}
                    onclick={() => {
                        driver.editor?.chain().focus().setParagraph().run();
                    }}
                >
                    {app.translator.trans('lady-byron-editor.forum.toolbar.paragraph')}
                </Button>
                {headings.map(({ level, label }) => (
                    <Button
                        className={driver.isActive('heading', { level }) ? 'active' : ''}
                        onclick={() => driver.setHeading(level)}
                    >
                        {label} - {app.translator.trans(`lady-byron-editor.forum.toolbar.heading_${level}`)}
                    </Button>
                ))}
            </Dropdown>
        );
    }

    /**
     * Create a formatting button
     */
    private formatButton(
        driver: TiptapEditorDriver,
        activeCheck: string | null,
        icon: string,
        title: string | Mithril.Children,
        onclick: () => void,
        disabled: boolean
    ): Mithril.Children {
        const isActive = activeCheck ? driver.isActive(activeCheck) : false;

        return (
            <Button
                className={`Button Button--icon ${isActive ? 'active' : ''}`}
                icon={icon}
                title={title}
                onclick={onclick}
                disabled={disabled}
            />
        );
    }

    /**
     * Create link button with prompt
     */
    private linkButton(driver: TiptapEditorDriver, disabled: boolean): Mithril.Children {
        const isActive = driver.isActive('link');

        return (
            <Button
                className={`Button Button--icon ${isActive ? 'active' : ''}`}
                icon="fas fa-link"
                title={app.translator.trans('lady-byron-editor.forum.toolbar.link')}
                disabled={disabled}
                onclick={() => {
                    const url = prompt(
                        String(app.translator.trans('lady-byron-editor.forum.toolbar.link_prompt')),
                        isActive ? '' : 'https://'
                    );
                    
                    if (url !== null) {
                        driver.setLink(url);
                    }
                }}
            />
        );
    }

    /**
     * Create image button with prompt
     */
    private imageButton(driver: TiptapEditorDriver, disabled: boolean): Mithril.Children {
        return (
            <Button
                className="Button Button--icon"
                icon="fas fa-image"
                title={app.translator.trans('lady-byron-editor.forum.toolbar.image')}
                disabled={disabled}
                onclick={() => {
                    const url = prompt(
                        String(app.translator.trans('lady-byron-editor.forum.toolbar.image_prompt')),
                        'https://'
                    );
                    
                    if (url) {
                        const alt = prompt(String(app.translator.trans('lady-byron-editor.forum.toolbar.image_alt'))) || '';
                        driver.insertImage(url, alt);
                    }
                }}
            />
        );
    }
}
