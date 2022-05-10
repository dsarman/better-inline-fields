import { Plugin } from 'obsidian';
import { checkboxPlugin } from 'cmPlugin';

export default class BetterInlineFieldsPlugin extends Plugin {
	async onload() {
		this.registerEditorExtension(checkboxPlugin);
	}
}
