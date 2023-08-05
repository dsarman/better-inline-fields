import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import range from 'lodash/range';
import { RangeSetBuilder } from '@codemirror/state';
import { CheckboxPosition } from 'settings/BetterInlineFieldsSettingTab';

const TRUE_VALUE = ':: true';
const FALSE_VALUE = ':: false';
const TOGGLE_CLASSNAME = 'bif-boolean-toggle';

const FIELD_REGEX = /.*::\s*(true|false)/g;

/**
 * CodeMirror widget that display a checkbox
 */
class CheckboxWidget extends WidgetType {
	constructor(readonly checked: boolean) {
		super();
	}

	eq(other: CheckboxWidget) {
		return other.checked == this.checked;
	}

	toDOM() {
		const box = document.createElement('input');
		box.className = TOGGLE_CLASSNAME;
		box.type = 'checkbox';
		box.checked = this.checked;
		return box;
	}

	ignoreEvent(_event: Event): boolean {
		return false;
	}
}

/**
 * General function to get all starting indexes of given string
 * @param text Text that is being searched through.
 * @param search Text that is being searched.
 */
function getIndicesOf(text: string, search: string): number[] {
	const indices: number[] = [];
	if (!text) return indices;

	let startIndex = 0;
	let index;
	while ((index = text.indexOf(search, startIndex)) >= 0) {
		indices.push(index);
		startIndex = index + search.length;
	}

	return indices;
}

/**
 * Creates a decorator of given kind.
 * @param index Target index of the decorator
 * @param kind type of checkbox
 * @param from starting position
 * @param replace If the widget should replace the value text or not
 */
function createDecorator(
	index: number,
	kind: boolean,
	from: number,
	checkboxPosition: CheckboxPosition,
	leftStart?: number,
): [Decoration, number, number] | null {
	if (checkboxPosition === 'none') return null;
	// If either boolean value was found, we create the checkbox widget
	let deco: Decoration;
	if (checkboxPosition === 'replace') {
		deco = Decoration.replace({
			widget: new CheckboxWidget(kind),
		});
	} else {
		deco = Decoration.widget({
			widget: new CheckboxWidget(kind),
		});
	}

	const fromIndex = from + index + 3;
	const toIndex =
		fromIndex - 3 + (kind ? TRUE_VALUE.length : FALSE_VALUE.length);
	if (checkboxPosition === 'replace') {
		return [deco, fromIndex, toIndex];
	} else {
		if (checkboxPosition === 'left' && leftStart !== undefined) {1
			return [deco, from + leftStart, from + leftStart];
		} else if (checkboxPosition === 'right') {
			return [deco, toIndex, toIndex];
		}
	}
	return null;
}

/**
 * Adds all decorators for particular line to given builder.
 */
function addDecoratorsForLine(
	line: string,
	from: number,
	builder: RangeSetBuilder<Decoration>,
	checkboxPosition: CheckboxPosition
) {
	const trueIndices = getIndicesOf(line, TRUE_VALUE).map((index) => ({
		index,
		kind: true,
	}));
	const falseIndices = getIndicesOf(line, FALSE_VALUE).map((index) => ({
		index,
		kind: false,
	}));
	const allIndices = trueIndices
		.concat(falseIndices)
		// All added decorators need to be added to the set sorted by index
		.sort(({ index: indexA }, { index: indexB }) => indexA - indexB);

	allIndices.forEach(({ kind, index }) => {
		let leftStart;
		if (checkboxPosition === 'left') {
			leftStart = getStartOfLineIndex(line);
		}
		const decoratorInfo = createDecorator(index, kind, from, checkboxPosition, leftStart);
		if (!decoratorInfo) return;

		const [decorator, fromIndex, toIndex] = decoratorInfo;
		builder.add(fromIndex, toIndex, decorator);
	});
}

function getStartOfLineIndex(line: string): number {
  const trimmedLine = line.trim();
  const isBulletPoint = trimmedLine.startsWith("- ");
  const startIndex = isBulletPoint ? 2 : 0;
  return line.indexOf(trimmedLine) + startIndex;
}

/**
 * Returns all CodeMirror checkbox decorators for boolean values.
 */
function getCheckboxDecorators(view: EditorView, checkboxPosition: CheckboxPosition, ) {
	const builder = new RangeSetBuilder<Decoration>();
	// We iterate over the visible ranges
	for (const { from, to } of view.visibleRanges) {
		const startLine = view.state.doc.lineAt(from);
		const endLine = view.state.doc.lineAt(to);

		for (const lineNumber of range(startLine.number, endLine.number)) {
			const line = view.state.doc.line(lineNumber);
			addDecoratorsForLine(line.text, line.from, builder, checkboxPosition);
		}
	}

	return builder.finish();
}

/**
 * Toggles boolean value on given position.
 */
const toggleBoolean = (view: EditorView, pos: number, checkboxPosition: CheckboxPosition) => {
	let to
	if (checkboxPosition === 'left' || checkboxPosition === 'replace') {
		const line = view.state.doc.lineAt(pos);
		const match = line.text.match(FIELD_REGEX);
		if (!match) return false;
		to = line.from + match[0].length;
	} else {
		to = pos;
	}
	const valueText = view.state.doc.sliceString(Math.max(0, to - 5), to);

	let changes;
	if (valueText === 'false') {
		changes = { from: to - 5, to, insert: 'true' };
	} else if (valueText.endsWith('true')) {
		changes = { from: to - 4, to, insert: 'false' };
	} else {
		return false;
	}
	view.dispatch({ changes });
	return true;
};

/**
 * The actual CodeMirror plugin definition that is exported and used in Obsidian.
 */
export const checkboxPlugin = (checkboxPosition: CheckboxPosition) => {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
	
			constructor(view: EditorView) {
				this.decorations = getCheckboxDecorators(view, checkboxPosition);
			}
	
			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged || update.selectionSet)
					this.decorations = getCheckboxDecorators(update.view, checkboxPosition);
			}
		},
		{
			decorations: (value) => value.decorations,
			eventHandlers: {
				mousedown: (e, view) => {
					const target = e.target as HTMLElement;
					if (
						target &&
						target.nodeName === 'INPUT' &&
						target.classList.contains(TOGGLE_CLASSNAME)
					) {
						return toggleBoolean(view, view.posAtDOM(target), checkboxPosition);
					}
					return false;
				},
			},
		}
)};
