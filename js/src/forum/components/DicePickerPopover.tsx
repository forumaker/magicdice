import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';

type DiceVariant = '1d6' | '1d20' | '1d10' | '2d6' | '2d20' | '2d10';

export interface DicePickerAttrs {
  label: string;
  icon: string;
  onPick: (variant: DiceVariant) => void;
}

export default class DicePickerPopover extends Component<DicePickerAttrs> {
  open: boolean;
  anchor: HTMLElement | null;
  popoverEl: HTMLElement | null;

  private _onDocClick!: (e: MouseEvent) => void;
  private _onKey!: (e: KeyboardEvent) => void;

  oninit(vnode: m.Vnode<DicePickerAttrs, this>) {
    super.oninit(vnode);
    this.open = false;
    this.anchor = null;
    this.popoverEl = null;

    this._onDocClick = (e: MouseEvent) => {
      if (!this.open) return;
      const pop = this.popoverEl;
      if (!pop) return;
      if (!pop.contains(e.target as Node) && !this.anchor?.contains(e.target as Node)) {
        this.close();
      }
    };

    this._onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.close();
    };
  }

  onremove() {
    document.removeEventListener('mousedown', this._onDocClick);
    document.removeEventListener('keydown', this._onKey);
  }

  toggle() {
    this.open = !this.open;

    const add = document.addEventListener.bind(document);
    const rm = document.removeEventListener.bind(document);

    if (this.open) {
      add('mousedown', this._onDocClick);
      add('keydown', this._onKey);
    } else {
      rm('mousedown', this._onDocClick);
      rm('keydown', this._onKey);
    }
  }

  close() {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('mousedown', this._onDocClick);
    document.removeEventListener('keydown', this._onKey);
    m.redraw();
  }

  private pick(variant: DiceVariant) {
    this.attrs.onPick?.(variant);
    this.close();
  }

  view(vnode: m.Vnode<DicePickerAttrs, this>) {
    const { label, icon } = vnode.attrs;

    const trigger = m(
      'button.Button.Button--icon',
      {
        type: 'button',
        title: label,
        'aria-haspopup': 'dialog',
        'aria-expanded': String(this.open),
        style: 'background:transparent;box-shadow:none;transform:none;',
        onclick: (e: MouseEvent) => {
          e.preventDefault();
          this.toggle();
          (e.currentTarget as HTMLElement).blur();
        },
        oncreate: (v: m.VnodeDOM) => {
          this.anchor = v.dom as HTMLElement;
        },
      },
      m('i', { className: `icon ${icon}`, 'aria-hidden': 'true' })
    );

    let style: Partial<CSSStyleDeclaration> | null = null;

    if (this.open && this.anchor) {
      const r = this.anchor.getBoundingClientRect();
      const narrow = window.innerWidth < 768;

      if (narrow) {
        style = {
          position: 'fixed',
          left: `${r.left}px`,
          top: `${r.top}px`,
          transform: 'translate(-100%, calc(-100% - 8px))',
        };
      } else {
        style = {
          position: 'fixed',
          left: `${r.left + r.width / 2}px`,
          top: `${r.top}px`,
          transform: 'translate(-50%, calc(-100% - 8px))',
        };
      }
    }

    const iconD6 = (app.forum.attribute<string>('magicDiceIconD6') || 'fas fa-dice-d6').trim();
    const iconD10 = (app.forum.attribute<string>('magicDiceIconD10') || 'fas fa-gem').trim();
    const iconD20 = (app.forum.attribute<string>('magicDiceIconD20') || 'fas fa-dice-d20').trim();

    const colorD6 = (app.forum.attribute<string>('magicDiceColorD6') || '#80b77e').trim();
    const colorD10 = (app.forum.attribute<string>('magicDiceColorD10') || '#a7253d').trim();
    const colorD20 = (app.forum.attribute<string>('magicDiceColorD20') || '#3f6f8d').trim();

    const variants: { key: DiceVariant; label: string; fa: string; color: string; type: 'd6' | 'd10' | 'd20' }[] = [
      { key: '1d6',  label: '1d6',  fa: iconD6,  color: colorD6,  type: 'd6' },
      { key: '2d6',  label: '2d6',  fa: iconD6,  color: colorD6,  type: 'd6' },
      { key: '1d10', label: '1d10', fa: iconD10, color: colorD10, type: 'd10' },
      { key: '2d10', label: '2d10', fa: iconD10, color: colorD10, type: 'd10' },
      { key: '1d20', label: '1d20', fa: iconD20, color: colorD20, type: 'd20' },
      { key: '2d20', label: '2d20', fa: iconD20, color: colorD20, type: 'd20' },
    ];

    return m.fragment({ key: 'magic-dice-picker' }, [
      trigger,
      this.open &&
        m(
          'div.MagicDice-PickerPopover',
          {
            style,
            oncreate: (v: m.VnodeDOM) => (this.popoverEl = v.dom as HTMLElement),
            onremove: () => (this.popoverEl = null),
          },
          m(
            'div.MagicDice-PickerGrid',
            variants.map((v) =>
              m(
                'button.MagicDice-PickerChoice',
                {
                  type: 'button',
                  'aria-label': v.label,
                  onclick: (e: MouseEvent) => {
                    e.preventDefault();
                    this.pick(v.key);
                  },
                },
                [
                  m(
                    `div.MagicDice-PickerDie.MagicDice-PickerDie--${v.type}`,
                    { style: { color: v.color } },
                    m('i', { className: `icon ${v.fa}`, 'aria-hidden': 'true' })
                  ),
                  m('div.MagicDice-PickerLabel', v.label),
                ]
              )
            )
          )
        ),
    ]);
  }
}