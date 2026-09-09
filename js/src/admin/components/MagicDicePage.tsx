import app from 'flarum/admin/app';
import ExtensionPage from 'flarum/admin/components/ExtensionPage';

function Section(iconClass: string, titleKey: string, ...children: any[]) {
  return m(
    'section.MagicDice-SettingsSection',
    m('h3', [
      m('i', { className: iconClass, 'aria-hidden': 'true' }),
      m('span', ' ' + app.translator.trans(titleKey)),
    ]),
    m('div.MagicDice-SettingsSection-content', children)
  );
}

const DICE: { key: 'd6' | 'd10' | 'd20'; defaultIcon: string; defaultColor: string }[] = [
  { key: 'd6', defaultIcon: 'fas fa-dice-d6', defaultColor: '#80b77e' },
  { key: 'd10', defaultIcon: 'fas fa-gem', defaultColor: '#a7253d' },
  { key: 'd20', defaultIcon: 'fas fa-dice-d20', defaultColor: '#3f6f8d' },
];

export default class MagicDicePage extends ExtensionPage {
  className() {
    return 'MagicDicePage';
  }

  iconSettingsGrid() {
    return m('div.MagicDice-IconGrid', [
      m('div.MagicDice-IconGrid-row.MagicDice-IconGrid-row--header', [
        m('span'),
        m('span', app.translator.trans('forumaker-magic-dice.admin.settings.icons.color')),
        m('span', app.translator.trans('forumaker-magic-dice.admin.settings.icons.icon')),
        m('span', app.translator.trans('forumaker-magic-dice.admin.settings.icons.preview')),
      ]),
      ...DICE.map(({ key, defaultIcon, defaultColor }) => {
        const iconSetting = this.setting(`magic-dice.icon.${key}`, defaultIcon);
        const colorSetting = this.setting(`magic-dice.color.${key}`, defaultColor);

        return m('div.MagicDice-IconGrid-row', [
          m('label', app.translator.trans(`forumaker-magic-dice.admin.settings.icons.${key}`)),
          m('div.MagicDice-ColorPicker', [
            m('input.MagicDice-ColorPicker-swatch', {
              type: 'color',
              value: colorSetting() || defaultColor,
              oninput: (e: InputEvent) => colorSetting((e.target as HTMLInputElement).value),
            }),
            m('input.FormControl', {
              type: 'text',
              value: colorSetting() || defaultColor,
              oninput: (e: InputEvent) => colorSetting((e.target as HTMLInputElement).value),
            }),
          ]),
          m('input.FormControl.MagicDice-IconGrid-iconInput', {
            type: 'text',
            value: iconSetting() || defaultIcon,
            oninput: (e: InputEvent) => iconSetting((e.target as HTMLInputElement).value),
          }),
          m(
            'span.MagicDice-IconPreview',
            { style: { color: colorSetting() || defaultColor } },
            m('i', { className: iconSetting() || defaultIcon, 'aria-hidden': 'true' })
          ),
        ]);
      }),
    ]);
  }

  content() {
    return m(
      'div.MagicDicePage',
      m('div.MagicDicePage-content', [
        Section(
          'fas fa-dice',
          'forumaker-magic-dice.admin.settings.section_main',
          m(
            'div.Form-group',
            this.buildSettingComponent({
              type: 'boolean',
              setting: 'magic-dice.clearOnEdit',
              label: app.translator.trans(
                'forumaker-magic-dice.admin.settings.clearOnEdit'
              ),
            })
          ),
          m('div.Form-group', this.iconSettingsGrid())
        ),
        m('div.Form-group', this.submitButton()),
      ])
    );
  }
}
