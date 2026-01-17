import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import extractText from 'flarum/common/utils/extractText';
import type MenuState from '../states/MenuState';
import type Mithril from 'mithril';

export interface NodeTypeDropdownAttrs {
    menuState: MenuState;
    disabled?: boolean;
}

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

export default class NodeTypeDropdown extends Dropdown {
    private menuState!: MenuState;
    private headingClickHandlers!: Map<number, (e: Event) => void>;
    private headingKeydownHandlers!: Map<number, (e: KeyboardEvent) => void>;
    private boundClickParagraph!: (e: Event) => void;
    private boundKeydownParagraph!: (e: KeyboardEvent) => void;

    static initAttrs(attrs: NodeTypeDropdownAttrs) {
        super.initAttrs(attrs);
        attrs.className = 'TiptapMenu-textType ButtonGroup';
    }

    oninit(vnode: Mithril.Vnode<NodeTypeDropdownAttrs>) {
        super.oninit(vnode);
        this.menuState = this.attrs.menuState;

        // 段落处理器
        this.boundClickParagraph = (e: Event) => {
            e.preventDefault();
            this.menuState.setParagraph();
        };
        this.boundKeydownParagraph = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.menuState.setParagraph();
            }
        };

        // 标题处理器
        this.headingClickHandlers = new Map();
        this.headingKeydownHandlers = new Map();

        HEADINGS.forEach(({ level }) => {
            this.headingClickHandlers.set(level, (e: Event) => {
                e.preventDefault();
                this.menuState.setHeading(level);
            });
            this.headingKeydownHandlers.set(level, (e: KeyboardEvent) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.menuState.setHeading(level);
                }
            });
        });
    }

    getButton(children: Mithril.Children): Mithril.Children {
        const activeLabel = this.getActiveLabel();
        const tooltip = extractText(app.translator.trans('lady-byron-editor.forum.toolbar.text_type'));

        return (
            <button
                className="Dropdown-toggle Button Button--icon Button--link NodeTypeButton Button--menuDropdown"
                data-toggle="dropdown"
                disabled={this.attrs.disabled}
                title={tooltip}
            >
                <span>{activeLabel}</span>
            </button>
        );
    }

    getMenu(items: Mithril.Children[]): Mithril.Children {
        return (
            <ul className="Dropdown-menu dropdown-menu NodeTypeDropdownMenu">
                {this.getNodeTypeButtons()}
            </ul>
        );
    }

    getActiveLabel(): string {
        if (!this.menuState?.editor) return 'P';
        const activeHeading = HEADINGS.find(h =>
            this.menuState.isActive('heading', { level: h.level })
        );
        return activeHeading ? activeHeading.label : 'P';
    }

    getNodeTypeButtons(): Mithril.Children[] {
        const buttons: Mithril.Children[] = [];
        const currentLabel = this.getActiveLabel();

        // 标题按钮 (H1-H6)，排除当前激活的
        HEADINGS.forEach(({ level, label }) => {
            if (label === currentLabel) return;
            buttons.push(
                <button
                    className="Button Button--icon Button--link NodeTypeButton"
                    onclick={this.headingClickHandlers.get(level)}
                    onkeydown={this.headingKeydownHandlers.get(level)}
                    title={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.heading', { level }))}
                    key={label}
                >
                    {label}
                </button>
            );
        });

        // 段落按钮 (P)，如果当前不是段落则显示
        if (currentLabel !== 'P') {
            buttons.push(
                <button
                    className="Button Button--icon Button--link NodeTypeButton"
                    onclick={this.boundClickParagraph}
                    onkeydown={this.boundKeydownParagraph}
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
