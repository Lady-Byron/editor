import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Dropdown from 'flarum/common/components/Dropdown';
import Tooltip from 'flarum/common/components/Tooltip';
import ItemList from 'flarum/common/utils/ItemList';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

// Mithril 全局变量
declare const m: Mithril.Static;

interface TiptapToolbarAttrs {
    menuState: MenuState | null;
    disabled?: boolean;
}

/**
 * TiptapToolbar - WYSIWYG formatting toolbar for Tiptap editor
 * 参考 askvortsov1/flarum-rich-text 的 ProseMirrorMenu 实现
 * 通过 MenuState 间接操作编辑器，实现解耦
 */
export default class TiptapToolbar extends Component<TiptapToolbarAttrs> {
    view() {
        const menuState = this.attrs.menuState;
        if (!menuState?.editor) return null;

        return <div className="TiptapMenu">{this.items().toArray()}</div>;
    }

    /**
     * 主工具栏按钮 - 使用 ItemList 支持扩展
     */
    items(): ItemList<Mithril.Children> {
        const items = new ItemList<Mithril.Children>();
        const menuState = this.attrs.menuState;
        const disabled = this.attrs.disabled || false;

        if (!menuState) return items;

        // 文本类型下拉菜单
        items.add('text_type', this.textTypeDropdown(menuState, disabled), 100);

        // 粗体
        items.add('bold', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.bold')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('bold') ? 'active' : ''}`}
                    icon="fas fa-bold"
                    onclick={() => menuState.toggleBold()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 90);

        // 斜体
        items.add('italic', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.italic')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('italic') ? 'active' : ''}`}
                    icon="fas fa-italic"
                    onclick={() => menuState.toggleItalic()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 80);

        // 引用
        items.add('quote', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.quote')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('blockquote') ? 'active' : ''}`}
                    icon="fas fa-quote-left"
                    onclick={() => menuState.toggleBlockquote()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 70);

        // 链接
        items.add('link', this.linkDropdown(menuState, disabled), 60);

        // 无序列表
        items.add('unordered_list', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.bullet_list')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('bulletList') ? 'active' : ''}`}
                    icon="fas fa-list-ul"
                    onclick={() => menuState.toggleBulletList()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 50);

        // 更多按钮（隐藏项）
        items.add('additional_items', this.hiddenItemsDropdown(menuState, disabled), 0);

        return items;
    }

    /**
     * 隐藏项 - 不常用的格式按钮
     */
    hiddenItems(): ItemList<Mithril.Children> {
        const items = new ItemList<Mithril.Children>();
        const menuState = this.attrs.menuState;
        const disabled = this.attrs.disabled || false;

        if (!menuState) return items;

        // 行内代码
        items.add('code', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.code')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('code') ? 'active' : ''}`}
                    icon="fas fa-code"
                    onclick={() => menuState.toggleCode()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 100);

        // 有序列表
        items.add('ordered_list', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.ordered_list')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('orderedList') ? 'active' : ''}`}
                    icon="fas fa-list-ol"
                    onclick={() => menuState.toggleOrderedList()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 90);

        // 删除线
        items.add('strike', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.strikethrough')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('strike') ? 'active' : ''}`}
                    icon="fas fa-strikethrough"
                    onclick={() => menuState.toggleStrike()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 80);

        // 代码块
        items.add('code_block', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.code_block')}>
                <Button
                    className={`Button Button--icon Button--link ${menuState.isActive('codeBlock') ? 'active' : ''}`}
                    icon="fas fa-terminal"
                    onclick={() => menuState.toggleCodeBlock()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 70);

        // 水平线
        items.add('horizontal_rule', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.horizontal_rule')}>
                <Button
                    className="Button Button--icon Button--link"
                    icon="fas fa-minus"
                    onclick={() => menuState.insertHorizontalRule()}
                    disabled={disabled}
                />
            </Tooltip>
        ), 60);

        // 撤销
        items.add('undo', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.undo')}>
                <Button
                    className="Button Button--icon Button--link"
                    icon="fas fa-undo"
                    onclick={() => menuState.undo()}
                    disabled={disabled || !menuState.canUndo()}
                />
            </Tooltip>
        ), 50);

        // 重做
        items.add('redo', (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.redo')}>
                <Button
                    className="Button Button--icon Button--link"
                    icon="fas fa-redo"
                    onclick={() => menuState.redo()}
                    disabled={disabled || !menuState.canRedo()}
                />
            </Tooltip>
        ), 40);

        return items;
    }

    /**
     * 文本类型下拉菜单（段落/标题）
     */
    private textTypeDropdown(menuState: MenuState, disabled: boolean): Mithril.Children {
        const headings: Array<{ level: 1 | 2 | 3 | 4 | 5 | 6; label: string }> = [
            { level: 1, label: 'H1' },
            { level: 2, label: 'H2' },
            { level: 3, label: 'H3' },
            { level: 4, label: 'H4' },
            { level: 5, label: 'H5' },
            { level: 6, label: 'H6' },
        ];

        const activeHeading = headings.find(h => menuState.isActive('heading', { level: h.level }));
        const buttonLabel = activeHeading ? activeHeading.label : 'P';

        return (
            <Dropdown
                className="TiptapMenu-textType ButtonGroup"
                buttonClassName="Button"
                menuClassName="NodeTypeDropdownMenu"
                label={buttonLabel}
                disabled={disabled}
            >
                <Button
                    className={`NodeTypeButton ${!activeHeading ? 'active' : ''}`}
                    onclick={() => menuState.setParagraph()}
                >
                    P
                </Button>
                {headings.map(({ level, label }) => (
                    <Button
                        key={level}
                        className={`NodeTypeButton ${menuState.isActive('heading', { level }) ? 'active' : ''}`}
                        onclick={() => menuState.setHeading(level)}
                    >
                        {label}
                    </Button>
                ))}
            </Dropdown>
        );
    }

    /**
     * 链接下拉菜单
     */
    private linkDropdown(menuState: MenuState, disabled: boolean): Mithril.Children {
        const isActive = menuState.isActive('link');

        return (
            <Tooltip text={app.translator.trans('lady-byron-editor.forum.toolbar.link')}>
                <Button
                    className={`Button Button--icon Button--link ${isActive ? 'active' : ''}`}
                    icon="fas fa-link"
                    disabled={disabled}
                    onclick={() => {
                        const url = prompt(
                            String(app.translator.trans('lady-byron-editor.forum.toolbar.link_prompt')),
                            isActive ? '' : 'https://'
                        );
                        if (url !== null) {
                            menuState.setLink(url);
                        }
                    }}
                />
            </Tooltip>
        );
    }

    /**
     * "更多"按钮下拉菜单
     */
    private hiddenItemsDropdown(menuState: MenuState, disabled: boolean): Mithril.Children {
        return (
            <Dropdown
                className="TiptapMenu-more"
                buttonClassName="Button Button--icon Button--link"
                icon="fas fa-ellipsis-h"
                label=""
                disabled={disabled}
                menuClassName="HiddenItemsDropdownMenu"
            >
                {this.hiddenItems().toArray()}
            </Dropdown>
        );
    }
}
