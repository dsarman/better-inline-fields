import { App, PluginSettingTab, Setting } from 'obsidian';
import BetterInlineFieldsPlugin from 'main';
import { FolderSuggest } from 'settings/FolderSuggest';

export interface BetterInlineFieldsSettings {
	autocomplete: { field: string; folder: string }[];
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
				.addText((text) =>
					text
						.setPlaceholder('Inline field name')
						.setValue(autocomplete.field)
						.onChange((newValue) => {
							this.plugin.settings.autocomplete[index].field = newValue;
							this.plugin.saveSettings();
						})
				)
				.addSearch((search) => {
					new FolderSuggest(this.app, search.inputEl);
					search
						.setPlaceholder('Folder')
						.setValue(autocomplete.folder)
						.onChange((newValue) => {
							this.plugin.settings.autocomplete[index].folder = newValue;
							this.plugin.saveSettings();
						});
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
