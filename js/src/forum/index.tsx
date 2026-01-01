import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import Post from 'flarum/common/models/Post';
import ItemList from 'flarum/common/utils/ItemList';
import CommentPost from 'flarum/forum/components/CommentPost';
import TextEditor from 'flarum/common/components/TextEditor';
import FieldSet from 'flarum/common/components/FieldSet';
import Stream from 'flarum/common/utils/Stream';

import DicePickerPopover, { DicePickerAttrs } from './components/DicePickerPopover';
import DiceSkinPicker, { DiceSkinId } from './components/DiceSkinPicker';

const EMOJI_BY_NUMBER = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const ONLY_ONE_DICE_REGEX = /^[\n\r]*\d+d\d+[\n\r]*$/i;

function currentDiceSkin(): DiceSkinId {
  const user = app.session?.user;
  const prefs = (user && user.preferences && user.preferences()) || {};
  const skin = (prefs.rollDieSkin as DiceSkinId) || 'classic';
  return skin;
}

function startRollAnimation(el: HTMLElement) {
  if (el.dataset.animating === '1') return;

  const sides = parseInt(el.dataset.sides || '6', 10) || 6;
  const finalNumber = parseInt(el.dataset.number || '1', 10) || 1;
  const isD6 = sides <= 6;
  const useEmojiD6 = el.dataset.useEmoji === '1';

  el.dataset.animating = '1';
  el.classList.add('is-rolling');

  const duration = 1500;
  const minInterval = 40;
  const maxInterval = 110;

  const start = performance.now();
  let lastTick = 0;

  const tick = (now: number) => {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    const currentInterval = minInterval + (maxInterval - minInterval) * progress;

    if (elapsed - lastTick >= currentInterval) {
      lastTick = elapsed;
      const value = Math.floor(Math.random() * sides) + 1;

      if (isD6 && value >= 1 && value <= 6) {
        el.dataset.number = String(value);
        if (useEmojiD6) el.textContent = EMOJI_BY_NUMBER[value - 1];
      } else {
        el.textContent = String(value);
      }
    }

    if (elapsed < duration) {
      requestAnimationFrame(tick);
    } else {
      if (isD6 && finalNumber >= 1 && finalNumber <= 6) {
        el.dataset.number = String(finalNumber);
        if (useEmojiD6) el.textContent = EMOJI_BY_NUMBER[finalNumber - 1];
        else el.textContent = '';
      } else {
        el.textContent = String(finalNumber);
      }

      el.classList.remove('is-rolling');
      delete el.dataset.animating;
    }
  };

  requestAnimationFrame(tick);
}

app.initializers.add('magic-dice', () => {
  override(Post.prototype, 'contentHtml', function (this: Post, original: () => string) {
    const contentHtml = original();
    const rollsAsString = this.attribute<string | undefined>('diceRolls');

    if (!rollsAsString) return contentHtml;

    const rolls = rollsAsString
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let index = 0;
    const skin = currentDiceSkin();
    const useEmojiD6 = skin === 'classic' || skin === 'circle';

    return contentHtml.replace(/(<(?:br|p)>[\n\r]*)(\d+d\d+)(?=<(?:br|\/p)>)/gim, (match, before, formula) => {
      const raw = rolls[index++];
      const number = raw ? parseInt(raw, 10) : NaN;

      const [, sidesStr] = String(formula).toLowerCase().split('d');
      const sides = parseInt(sidesStr, 10) || 6;
      const isD20 = sides > 6;

      const span = document.createElement('span');

      let className = 'roll-a-die';
      className += isD20 ? ' roll-a-die--d20' : ' roll-a-die--d6';
      className += ' roll-a-die--skin-' + skin;
      span.className = className;

      span.dataset.sides = String(sides);

      if (!isNaN(number)) {
        span.dataset.number = String(number);

        // removed tooltip
        span.dataset.useEmoji = !isD20 && useEmojiD6 ? '1' : '0';

        if (!isD20 && number >= 1 && number <= 6) {
          span.textContent = useEmojiD6 ? EMOJI_BY_NUMBER[number - 1] : '';
        } else {
          span.textContent = String(number);
        }
      } else {
        span.textContent = '⚠';
      }

      span.classList.add('roll-a-die--will-animate');

      return before + span.outerHTML;
    });
  });

  extend(CommentPost.prototype, 'oncreate', function (this: CommentPost) {
    const root = this.element;
    if (!root) return;

    // removed Tooltip wrapper — now direct span
    root.querySelectorAll<HTMLElement>('.roll-a-die').forEach((el) => {
      const vnode = m(
        'span',
        {
          class: el.className,
          'data-sides': el.dataset.sides,
          'data-number': el.dataset.number,
          'data-useEmoji': el.dataset.useEmoji,
        },
        el.textContent || ''
      );

      const mountPoint = document.createElement('span');
      el.replaceWith(mountPoint);
      m.mount(mountPoint, { view: () => vnode });
    });

    root.querySelectorAll<HTMLElement>('.roll-a-die--will-animate').forEach((el) => {
      el.classList.remove('roll-a-die--will-animate');
      startRollAnimation(el);
    });
  });

  extend(CommentPost.prototype, 'onupdate', function (this: CommentPost) {
    const root = this.element;
    if (!root) return;

    root.querySelectorAll<HTMLElement>('.roll-a-die--will-animate').forEach((el) => {
      el.classList.remove('roll-a-die--will-animate');
      startRollAnimation(el);
    });
  });

  override(s9e.TextFormatter, 'preview', (original: any, text: string, element: HTMLElement) => {
    original(text, element);

    let walk: TreeWalker;
    let node: Node | null;

    walk = document.createTreeWalker(element);
    while ((node = walk.nextNode())) {
      if (node instanceof HTMLElement && node.classList.contains('roll-a-die') && !ONLY_ONE_DICE_REGEX.test(node.textContent || '')) {
        const textNode = document.createTextNode(node.textContent || '');
        node.parentNode!.replaceChild(textNode, node);
      }
    }

    walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const replaceQueue: Node[] = [];
    const skin = currentDiceSkin();

    while ((node = walk.nextNode())) {
      if (!node.textContent) continue;
      if ((node.parentNode as HTMLElement).classList.contains('roll-a-die')) continue;
      if (ONLY_ONE_DICE_REGEX.test(node.textContent)) replaceQueue.push(node);
    }

    replaceQueue.forEach((node) => {
      const span = document.createElement('span');
      span.className = `roll-a-die preview roll-a-die--skin-${skin}`;
      span.textContent = '🎲';
      node.parentNode!.replaceChild(span, node);
    });
  });

  extend(TextEditor.prototype, 'toolbarItems', function (this: TextEditor, items: ItemList) {
    const editor = this.attrs.composer && this.attrs.composer.editor;
    const label = app.translator.trans('forumaker-magic-dice.forum.composer.rollDie');
    const icon = 'fas fa-dice-d20';

    const onPick: DicePickerAttrs['onPick'] = (variant) => {
      if (!editor) return;

      switch (variant) {
        case '1d6':
          editor.insertAtCursor('1d6\n');
          break;
        case '1d20':
          editor.insertAtCursor('1d20\n');
          break;
        case '2d6':
          editor.insertAtCursor('1d6\n1d6\n');
          break;
        case '2d20':
          editor.insertAtCursor('1d20\n1d20\n');
          break;
      }
    };

    items.add('magic-dice', m(DicePickerPopover, { label, icon, onPick } as DicePickerAttrs), -10);
  });
});

app.initializers.add('magic-dice-preferences', () => {
  extend('flarum/forum/components/SettingsPage', 'oninit', function () {
    const user = this.user;
    const prefs = (user && user.preferences && user.preferences()) || {};
    this.diceSkin = Stream((prefs.rollDieSkin as DiceSkinId) || 'classic');

    this.diceSkinItems = () => {
      const items = new ItemList();

      items.add(
        'dice-skin-picker',
        m(DiceSkinPicker, {
          value: this.diceSkin(),
          onChange: (skin: DiceSkinId) => {
            this.diceSkin(skin);
            return user.savePreferences({ rollDieSkin: skin }).then(() => {
              m.redraw();
            });
          },
        })
      );

      return items;
    };
  });

  extend('flarum/forum/components/SettingsPage', 'settingsItems', function (items: ItemList) {
    if (!this.user) return;

    const diceItems = typeof this.diceSkinItems === 'function' ? this.diceSkinItems() : null;
    if (!diceItems) return;

    items.add(
      'magic-dice-skin',
      FieldSet.component(
        {
          label: app.translator.trans('forumaker-magic-dice.forum.settings.diceSkin.heading'),
          className: 'Settings-diceSkin',
        },
        diceItems.toArray()
      ),
      40
    );
  });
});