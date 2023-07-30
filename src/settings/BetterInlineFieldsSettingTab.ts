import { App, PluginSettingTab, Setting } from 'obsidian';
import BetterInlineFieldsPlugin from 'main';
import { FolderSuggest } from 'settings/FolderSuggest';

export type CheckboxPosition = 'left' | 'right' | 'replace' | 'none';

export interface BetterInlineFieldsSettings {
	autocomplete: { field: string; folder: string }[];
	regexpTrigger: string;
	checkboxPosition: CheckboxPosition;
}

function isCheckboxPosition(newValue: string): newValue is CheckboxPosition {
	return ['left', 'right', 'replace', 'none'].includes(newValue);
}

export class BetterInlineFieldsSettingTab extends PluginSettingTab {
	plugin: BetterInlineFieldsPlugin;

	constructor(app: App, plugin: BetterInlineFieldsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', {
			text: 'Settings for Better Inline Fields plugin',
		});

		const isDataviewEnabled = this.app.plugins.enabledPlugins.has('dataview');
		if (!isDataviewEnabled) {
			containerEl.createEl('h1', {
				text: 'You need to install and enable the Obsidian Dataview plugin to use the autocompletion feature.',
			});
			return;
		}

		new Setting(this.containerEl)
			.setName('Boolean inline field checkbox position')
			.setDesc('Position of the checkbox for inline boolean fields (eg. "value:: true" and "[[value:: true]]"). Reload Obisidian for the change to take effect.')
			.addDropdown((dropdown) => {
				dropdown.addOption('left', 'Beginning of line');
				dropdown.addOption('right', 'After value');
				dropdown.addOption('replace', 'Replace value');
				dropdown.addOption('none', 'None');
				dropdown.setValue(this.plugin.settings.checkboxPosition);
				dropdown.onChange(async (newValue) => {
					if (!isCheckboxPosition(newValue)) return;
					this.plugin.settings.checkboxPosition = newValue;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl)
			.setName('Autocompletion Regexp Trigger')
			.setDesc(
				'Character that triggers regexp search in autocompletion (needs to be at start)'
			)
			.addText((text) =>
				text
					.setPlaceholder('/')
					.setValue(this.plugin.settings.regexpTrigger)
					.onChange((newValue) => {
						this.plugin.settings.regexpTrigger = newValue;
						this.plugin.saveSettings();
					})
			);

		new Setting(this.containerEl)
			.setName('Add New')
			.setDesc('Add new autocomplete field')
			.addButton((button) => {
				button
					.setButtonText('+')
					.setCta()
					.onClick(() => {
						this.plugin.settings.autocomplete.push({ field: '', folder: '' });
						this.plugin.saveSettings();
						this.display();
					});
			});

		this.plugin.settings.autocomplete.forEach((autocomplete, index) => {
			const setting = new Setting(containerEl)
				.addText((text) => {
					text
						.setPlaceholder('Inline field name')
						.setValue(autocomplete.field)
						.onChange((newValue) => {
							this.plugin.settings.autocomplete[index].field = newValue;
							this.plugin.saveSettings();
						});
					text.inputEl.addClass('better_inline_fields_setting');
				})
				.addSearch((search) => {
					new FolderSuggest(this.app, search.inputEl);
					search
						.setPlaceholder('Folder')
						.setValue(autocomplete.folder)
						.onChange((newValue) => {
							this.plugin.settings.autocomplete[index].folder = newValue;
							this.plugin.saveSettings();
						});
					// @ts-ignore
					search.containerEl.addClass('better_inline_fields_setting');
				})
				.addExtraButton((button) => {
					button
						.setIcon('cross')
						.setTooltip('Delete')
						.onClick(() => {
							this.plugin.settings.autocomplete.splice(index, 1);
							this.plugin.saveSettings();
							this.display();
						});
				});

			setting.infoEl.remove();
		});
	}
}
