import { Plugin } from 'obsidian';
import { checkboxPlugin } from 'cmPlugin';
import {
	BetterInlineFieldsSettings,
	BetterInlineFieldsSettingTab,
} from 'settings/BetterInlineFieldsSettingTab';
import { PagesEditSuggest } from 'suggestions/PagesEditSuggest';

const DEFAULT_SETTINGS = { autocomplete: [], regexpTrigger: '/' };

export default class BetterInlineFieldsPlugin extends Plugin {
	settings: BetterInlineFieldsSettings = DEFAULT_SETTINGS;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();
		this.registerEditorExtension(checkboxPlugin);
		this.addSettingTab(new BetterInlineFieldsSettingTab(this.app, this));
		this.registerEditorSuggest(new PagesEditSuggest(this.app, this));
	}
}
