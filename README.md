# Better Inline Fields
Simple Obsidian plugin that aims to improve work with [Dataview inline fields](https://blacksmithgu.github.io/obsidian-dataview/data-annotation/) (like `Some Field:: value`).

## Features
- Checkbox that allows toggling of inline boolean values

![Checkboxes](https://raw.githubusercontent.com/dsarman/better-inline-fields/master/imgs/checkboxes.gif)

- Autocompletion of field values based on pages in a configured folder (needs [dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin).
  - Takes aliases into account.
  - Regexp can be used to search the autocomplete values by prefixing the text with regexp trigger (configurable in settings, "/" by default).
    - `Field:: /.*a.*b` 

![Pages Autocomplete](https://raw.githubusercontent.com/dsarman/better-inline-fields/master/imgs/field-autocomplete.gif)

## Other Plugins
### Compatible
- [Checklist Soundeffects](https://github.com/sfdrada/Checklist-Soundeffect) - allows one to add sound effects when toggling checkboxes.
### Incompatible
- [Various Complements](https://tadashi-aikawa.github.io/docs-obsidian-various-complements-plugin/) This plugin is not compatible with the with the "Complement automatically" setting turned on (see [#2](https://github.com/dsarman/better-inline-fields/issues/2)).

## Attributions
- The settings suggest input uses code from [obsidian-periodic-notes](https://github.com/liamcain/obsidian-periodic-notes)
