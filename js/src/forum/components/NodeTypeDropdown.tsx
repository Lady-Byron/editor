import app from 'flarum/forum/app';
import Tooltip from 'flarum/common/components/Tooltip';
import extractText from 'flarum/common/utils/extractText';
import TiptapDropdown, { TiptapDropdownAttrs } from './TiptapDropdown';
import type Mithril from 'mithril';

interface HeadingOption {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    label: string;
}

const HEADINGS: HeadingOption[] = [
    { level: 1, label: 'H1' },
    { level: 2, label: 'H2' },
    { level: 3, label: 'H3' },
    { level: 4, label: 'H4' },
    { level: 5, label: 'H5' },
    { level: 6, label: 'H6' },
];

export default class NodeTypeDropdown extends TiptapDropdown {
    static initAttrs(attrs: TiptapDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-textType ButtonGroup';
        attrs.buttonClassName = 'Button Button--icon Button--link NodeTypeButton Button--menuDropdown';
    }

    oninit(vnode: Mithril.Vnode<TiptapDropdownAttrs>) {
        super.oninit(vnode);

        // 注册段落处理器
        this.createHandlers('paragraph', () => this.menuState.setParagraph());

        // 注册各级标题处理器
        HEADINGS.forEach(({ level }) => {
            this.createHandlers(`h${level}`, () => this.menuState.setHeading(level));
        });
    }

    getButtonContent(): Mithril.Children {
        const activeLabel = this.getActiveLabel();
        const tooltip = extractText(app.translator.trans('lady-byron-editor.forum.toolbar.text_type'));

        return (
            <Tooltip text={tooltip}>
                <span>{activeLabel}</span>
            </Tooltip>
        );
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu NodeTypeDropdownMenu">
                {this.getNodeTypeButtons()}
            </ul>
        );
    }

    private getActiveLabel(): string {
        if (!this.menuState?.editor) return 'P';
        const activeHeading = HEADINGS.find(h =>
            this.menuState.isActive('heading', { level: h.level })
        );
        return activeHeading ? activeHeading.label : 'P';
    }

    private getNodeTypeButtons(): Mithril.Children[] {
        const buttons: Mithril.Children[] = [];
        const currentLabel = this.getActiveLabel();

        HEADINGS.forEach(({ level, label }) => {
            if (label === currentLabel) return;
            buttons.push(
                <button
                    className="Button Button--icon Button--link NodeTypeButton"
                    onclick={this.clickHandlers.get(`h${level}`)}
                    onkeydown={this.keydownHandlers.get(`h${level}`)}
                    title={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.heading', { level }))}
                    key={label}
                >
                    {label}
                </button>
            );
        });

        if (currentLabel !== 'P') {
            buttons.push(
                <button
                    className="Button Button--icon Button--link NodeTypeButton"
                    onclick={this.clickHandlers.get('paragraph')}
                    onkeydown={this.keydownHandlers.get('paragraph')}
                    title={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.paragraph'))}
                    key="p"
                >
                    P
                </button>
            );
        }

        return buttons;
    }
}
