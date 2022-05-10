import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/rangeset';
import range from 'lodash/range';

const TRUE_VALUE = ':: true';
const FALSE_VALUE = ':: false';
const TOGGLE_CLASSNAME = 'bif-boolean-toggle';

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
 */
function createDecorator(
	index: number,
	kind: boolean,
	from: number
): [Decoration, number] | null {
	// If either boolean value was found, we create the checkbox widget
	const deco = Decoration.widget({
		widget: new CheckboxWidget(kind),
		side: 1,
	});

	const fromIndex =
		from + index + (kind ? TRUE_VALUE.length : FALSE_VALUE.length);
	return [deco, fromIndex];
}

/**
 * Adds all decorators for particular line to given builder.
 */
function addDecoratorsForLine(
	line: string,
	from: number,
	builder: RangeSetBuilder<Decoration>
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
		const decoratorInfo = createDecorator(index, kind, from);
		if (!decoratorInfo) return;

		const [decorator, fromIndex] = decoratorInfo;
		builder.add(fromIndex, fromIndex, decorator);
	});
}

/**
 * Returns all CodeMirror checkbox decorators for boolean values.
 */
function getCheckboxDecorators(view: EditorView) {
	const builder = new RangeSetBuilder<Decoration>();
	// We iterate over the visible ranges
	for (const { from, to } of view.visibleRanges) {
		const startLine = view.state.doc.lineAt(from);
		const endLine = view.state.doc.lineAt(to);

		for (const lineNumber of range(startLine.number, endLine.number)) {
			const line = view.state.doc.line(lineNumber);
			addDecoratorsForLine(line.text, line.from, builder);
		}
	}

	return builder.finish();
}

/**
 * Toggles boolean value on given position.
 */
const toggleBoolean = (view: EditorView, pos: number) => {
	const before = view.state.doc.sliceString(Math.max(0, pos - 5), pos);
	let changes;
	if (before === 'false') {
		changes = { from: pos - 5, to: pos, insert: 'true' };
	} else if (before.endsWith('true')) {
		changes = { from: pos - 4, to: pos, insert: 'false' };
	} else {
		return false;
	}
	view.dispatch({ changes });
	return true;
};

/**
 * The actual CodeMirror plugin definition that is exported and used in Obsidian.
 */
export const checkboxPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = getCheckboxDecorators(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged)
				this.decorations = getCheckboxDecorators(update.view);
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
					return toggleBoolean(view, view.posAtDOM(target));
				}
				return false;
			},
		},
	}
);
