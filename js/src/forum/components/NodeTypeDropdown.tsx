import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Dropdown from 'flarum/common/components/Dropdown';
import Tooltip from 'flarum/common/components/Tooltip';
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

// 静态常量，避免每次实例化重复创建
const HEADINGS: HeadingOption[] = [
    { level: 1, label: 'H1' },
    { level: 2, label: 'H2' },
    { level: 3, label: 'H3' },
    { level: 4, label: 'H4' },
    { level: 5, label: 'H5' },
    { level: 6, label: 'H6' },
];

export default class NodeTypeDropdown extends Component<NodeTypeDropdownAttrs> {
    private boundClickParagraph!: (e: Event) => void;
    private boundKeydownParagraph!: (e: KeyboardEvent) => void;
    private headingClickHandlers!: Map<number, (e: Event) => void>;
    private headingKeydownHandlers!: Map<number, (e: KeyboardEvent) => void>;

    oninit(vnode: Mithril.Vnode<NodeTypeDropdownAttrs>) {
        super.oninit(vnode);

        // 段落处理器
        this.boundClickParagraph = (e: Event) => {
            e.preventDefault();
            this.attrs.menuState.setParagraph();
        };
        this.boundKeydownParagraph = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.attrs.menuState.setParagraph();
            }
        };

        // 标题处理器
        this.headingClickHandlers = new Map();
        this.headingKeydownHandlers = new Map();

        HEADINGS.forEach(({ level }) => {
            this.headingClickHandlers.set(level, (e: Event) => {
                e.preventDefault();
                this.attrs.menuState.setHeading(level);
            });
            this.headingKeydownHandlers.set(level, (e: KeyboardEvent) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    this.attrs.menuState.setHeading(level);
                }
            });
        });
    }

    view() {
        const { menuState, disabled } = this.attrs;
        if (!menuState?.editor) return null;

        const activeHeading = HEADINGS.find(h =>
            menuState.isActive('heading', { level: h.level })
        );
        const buttonLabel = activeHeading ? activeHeading.label : 'P';

        return (
            <Dropdown
                className="TiptapMenu-textType ButtonGroup"
                buttonClassName="Button Button--icon Button--link NodeTypeButton Button--menuDropdown"
                menuClassName="NodeTypeDropdownMenu"
                label={buttonLabel}
                disabled={disabled}
            >
                {this.getNodeTypeButtons()}
            </Dropdown>
        );
    }

    getNodeTypeButtons(): Mithril.Children[] {
        const { menuState } = this.attrs;
        const buttons: Mithril.Children[] = [];

        // 标题按钮 (H1-H6)
        HEADINGS.forEach(({ level, label }) => {
            buttons.push(
                <Tooltip
                    text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.heading', { level }))}
                    key={label}
                >
                    <button
                        className={`Button Button--icon Button--link NodeTypeButton ${menuState.isActive('heading', { level }) ? 'active' : ''}`}
                        onclick={this.headingClickHandlers.get(level)}
                        onkeydown={this.headingKeydownHandlers.get(level)}
                    >
                        {label}
                    </button>
                </Tooltip>
            );
        });

        // 段落按钮 (P) 放在最后
        const activeHeading = HEADINGS.find(h =>
            menuState.isActive('heading', { level: h.level })
        );

        buttons.push(
            <Tooltip text={extractText(app.translator.trans('lady-byron-editor.forum.toolbar.paragraph'))} key="p">
                <button
                    className={`Button Button--icon Button--link NodeTypeButton ${!activeHeading ? 'active' : ''}`}
                    onclick={this.boundClickParagraph}
                    onkeydown={this.boundKeydownParagraph}
                >
                    P
                </button>
            </Tooltip>
        );

        return buttons;
    }
}
