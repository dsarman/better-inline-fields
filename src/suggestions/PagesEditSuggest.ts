import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	MarkdownView,
	TFile,
} from 'obsidian';
import BetterInlineFieldsPlugin from 'main';
import { getAPI } from 'obsidian-dataview';
import { DataArray } from 'obsidian-dataview/lib/api/data-array';
import { Literal } from 'obsidian-dataview/lib/data-model/value';

type DataviewPages = DataArray<Record<string, Literal> & { file: any }>;

interface Suggestion {
	query: string;
	startIndex: number;
	label: string;
	isEmptyChoice?: boolean;
	field?: string;
}

const SEPARATOR = ';-;';
const fieldValueRegexp = /(?:\[\[.*]])*,*\s*(.*)/;

export class PagesEditSuggest extends EditorSuggest<Suggestion> {
	private plugin: BetterInlineFieldsPlugin;
	private readonly app: App;
	private justCompleted: boolean;

	constructor(app: App, plugin: BetterInlineFieldsPlugin) {
		super(app);
		this.app = app;
		this.plugin = plugin;
		this.justCompleted = false;
	}
	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		if (this.justCompleted) {
			this.justCompleted = false;
			return null;
		}
		const fields = this.plugin.settings.autocomplete.map(
			(autocomplete) => autocomplete.field
		);
		for (const field of fields) {
			let fieldText = `${field}:: `;
			if (
				!editor
					.getRange({ line: cursor.line, ch: 0 }, cursor)
					.startsWith(fieldText)
			) {
				fieldText = fieldText.slice(0, -1);
				if (
					!editor
						.getRange({ line: cursor.line, ch: 0 }, cursor)
						.startsWith(fieldText)
				)
					continue;
			}

			const startPos = {
				line: cursor.line,
				ch: fieldText.length,
			};
			const fieldValue = editor.getRange(startPos, cursor);

			return {
				start: startPos,
				end: cursor,
				// We need access to the field name to get the suggestion.
				// The EditorSuggestTriggerInfo is not extendable, so we pass the info
				// here with a separator and parse it out later.
				query: `${field}${SEPARATOR}${fieldValue}`,
			};
		}
		return null;
	}

	getSuggestions(
		context: EditorSuggestContext
	): Suggestion[] | Promise<Suggestion[]> {
		const api = getAPI(this.app);
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !api) return [];

		const splitQuery = context.query.split(SEPARATOR);
		const field = splitQuery[0];
		const fieldValue = splitQuery[1];
		let query: string, startIndex: number;

		// If we already have a link value, we need to exclude it from matching
		if (fieldValue.contains('[[')) {
			const match = fieldValue.match(fieldValueRegexp);
			if (!match || match.length < 2) return [];
			query = match[1];
			const withSpaceIndex = fieldValue.indexOf(`, ${query}`);
			if (withSpaceIndex) {
				startIndex = withSpaceIndex + 2;
			} else {
				const withoutSpaceIndex = fieldValue.indexOf(`,${query}`);
				if (withoutSpaceIndex) {
					startIndex = withSpaceIndex - 1;
				} else {
					startIndex = fieldValue.length;
				}
			}
		} else {
			query = fieldValue;
			startIndex = 0;
		}

		const searchFolder = this.plugin.settings.autocomplete.find(
			(autocomplete) => autocomplete.field === field
		);
		if (!searchFolder) return [];
		const pages = api.pages(`"${searchFolder.folder}"`) as DataviewPages;
		const labels: string[] = [];

		pages.forEach((page) => {
			labels.push(page.file.name);
			page.file.aliases.forEach((alias: string) =>
				labels.push(`${page.file.name}|${alias}`)
			);
		});

		const allSuggestions = labels
			.filter((label) => {
				// The query is regex
				if (query.startsWith(this.plugin.settings.regexpTrigger)) {
					return label.match(new RegExp(query.slice(1)));
				} else {
					return label.toLowerCase().normalize().includes(query.toLowerCase());
				}
			})
			.map((label) => ({
				query,
				label,
				startIndex,
			}));

		return [
			...allSuggestions,
			{ query, label: '+ Create New', startIndex, isEmptyChoice: true, field },
		];
	}

	renderSuggestion(suggestion: Suggestion, el: HTMLElement): void {
		el.setText(suggestion.label);
	}

	selectSuggestion(
		suggestion: Suggestion,
		event: MouseEvent | KeyboardEvent
	): void {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		const startPos = this.context?.start;
		const endPos = this.context?.end;
		if (!activeView || !startPos || !endPos) return;
		let text = suggestion.label;
		if (suggestion.isEmptyChoice && suggestion.field) {
			text = suggestion.query;
			const folderPath = this.plugin.settings.autocomplete.find(
				(autocomplete) => autocomplete.field === suggestion.field
			)?.folder;
			if (folderPath) {
				this.app.vault.create(`${folderPath}/${text}.md`, '');
			}
		}

		const fromPos = {
			line: startPos.line,
			ch: startPos.ch + suggestion.startIndex,
		};

		activeView.editor.replaceRange(`[[${text}]]`, fromPos, endPos);

		const cursorPos = {
			line: endPos.line,
			ch: endPos.ch + 4 + text.length - suggestion.query.length,
		};
		activeView.editor.setCursor(cursorPos);

		this.justCompleted = true;
	}
}
