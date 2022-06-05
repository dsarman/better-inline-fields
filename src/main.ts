import { Plugin } from 'obsidian';
import { checkboxPlugin } from 'cmPlugin';
import { BetterInlineFieldsSettings, BetterInlineFieldsSettingTab } from "settings/BetterInlineFieldsSettingTab";
import { PagesEditSuggest } from "suggestions/PagesEditSuggest";

export default class BetterInlineFieldsPlugin extends Plugin {
	settings: BetterInlineFieldsSettings

	async loadSettings() {
		this.settings = Object.assign({}, {autocomplete: []}, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();
		this.registerEditorExtension(checkboxPlugin);
		this.addSettingTab(new BetterInlineFieldsSettingTab(this.app, this))
		this.registerEditorSuggest(new PagesEditSuggest(this.app, this))
	}

}
