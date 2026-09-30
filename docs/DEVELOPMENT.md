# Developer guide

[← Back to Enuncia](../README.md)

Enuncia is a React and TypeScript application built with Vite. Its catalog is file-based, its grading engine runs locally, and its versioned progress format lives in browser storage.

## Project structure

```text
.
├── src/
│   ├── content/
│   │   ├── areas.json           # Registered course areas
│   │   ├── blocks.json          # Registered learning blocks
│   │   └── formalizacion.json   # Original exercise bank
│   ├── App.tsx                 # Screens, editors, feedback, and type registry
│   ├── CourseBrowser.tsx       # Area, block, and difficulty selection
│   ├── course.ts               # Scoped filtering, counters, and pagination
│   ├── catalog.ts              # Catalog loading and validation
│   ├── logic.ts                # Formula parser, evaluator, and grader
│   ├── progress.ts             # Validation, merging, statistics, and exam selection
│   ├── types.ts                # Exercise and progress types
│   ├── styles.css              # Responsive interface
│   └── main.tsx                # React entry point
├── tests/logic.test.ts
├── docs/
├── Iniciar.command             # macOS launcher
└── vite.config.ts
```

Install dependencies with `npm ci`. Use the scripts listed in the [README](../README.md#development). Development and preview both use `127.0.0.1:5173` with strict port selection; stop one server before starting the other.

The launcher prefers Homebrew's Node installation, can fall back to the bundled Codex runtime when available, and checks for Node 22.12 or newer. Without installed dependencies, it runs `npm install` before starting the server.

## Add an exercise

Edit [`src/content/formalizacion.json`](../src/content/formalizacion.json) or add another JSON file under `src/content/`. Each exercise file must contain an array. Vite's glob import loads every JSON file in that directory except the metadata files `blocks.json` and `areas.json`.

This example uses English prose for illustration. Match the existing Spanish content when extending the shipped exercise bank:

```json
[
  {
    "id": "enu-for-041",
    "blockId": "enunciados-formalizacion",
    "type": "formalization",
    "difficulty": "media",
    "title": "A necessary condition",
    "statement": "For the library to open, it is necessary for the staff to arrive.",
    "atoms": {
      "P": "The library opens",
      "Q": "The staff arrive"
    },
    "solution": "P → Q",
    "tags": ["necessary condition"],
    "hints": [
      "Identify the required condition.",
      "The arrival of the staff is necessary for the library to open."
    ],
    "explanation": "Opening P requires Q, so the formula is P → Q."
  }
]
```

### Content contract

| Field | Requirement |
| :--- | :--- |
| `id` | A unique, nonempty, stable identifier. |
| `blockId` | An identifier registered in `blocks.json`. |
| `type` | A type registered in the catalog and UI. Currently `formalization`. |
| `difficulty` | `basica`, `media`, or `avanzada`. These stored values remain in Spanish. |
| `title`, `statement` | Nonempty strings. |
| `atoms` | One to eight named atoms with nonempty definitions. Names follow `[A-Za-z][A-Za-z0-9_]*`. |
| `solution` | A formula that parses using the supplied atoms. |
| `tags` | An array of topic labels used by search. |
| `hints` | Exactly two nonempty strings. |
| `explanation` | A nonempty explanation of the intended translation. |

Catalog validation runs at startup. It catches invalid identifiers, references, types, difficulties, atoms, and formulas. It does **not** establish that a natural-language statement has been translated correctly: review the statement, formula, hints, and explanation together.

Use new IDs for genuinely new exercises. Do not reuse an existing ID for a different meaning or rename it after progress has been recorded.

## Add a block

Declare the block in [`src/content/blocks.json`](../src/content/blocks.json):

```json
{
  "id": "enunciados-condiciones",
  "areaId": "enunciados",
  "title": "Lógica de enunciados",
  "subtitle": "Condiciones necesarias y suficientes",
  "description": "Practica el papel de cada condición.",
  "type": "formalization"
}
```

Append this object to the existing block array, then add exercises using its `blockId`. Each exercise type must match its block's type.

Areas are declared in `src/content/areas.json` with `id`, `title`, `description`, and `symbol`. Block `areaId` values must reference an existing area. Add an area there to expose another course section in the home screen and practice navigation.

The practice route uses **area → block → level → exercises**, with ten exercises per page. Search, review filters, and next-exercise navigation stay within the selected block and level. Clearing filters preserves the selected difficulty; changing difficulty uses the level cards. Direct continuation resolves the exercise's area, block, difficulty, and page automatically.

Block cards compute completed, incomplete, and unattempted counts as a partition of their exercise pool. The separate pending-review count may include a previously completed exercise with a newer mistake.

A block without exercises is displayed as planned and disabled. Its type may be declared in block metadata before its editor exists; exercises still require a registered editor/grader and content validation. Implement a new type before adding its exercise data. The existing 40 exercise IDs and progress storage format are unchanged.

## Add an exercise type

New types require implementation, not just another JSON file:

1. Register the type and its content validation in [`src/catalog.ts`](../src/catalog.ts). The current validator assumes a formalization solution; introduce type-specific validation for other formats.
2. Extend the data types in [`src/types.ts`](../src/types.ts) if the new format needs different fields.
3. Add an editor and grader to `typeRegistry` in [`src/App.tsx`](../src/App.tsx). The current registry uses the formalization editor and grader signatures; generalize those interfaces for the new type.
4. Adapt `Statement`, `Solution`, practice feedback, and exam review for the new data shape. The current exam submission passes a formula, solution, and atom list to its grader.
5. Decide whether the new type belongs in mock exams and update selection and scoring as needed.
6. Add meaningful tests for the new correction behavior and progress compatibility.

Existing navigation, history, and persistence can be reused. The type system and rendering are not yet a generic plugin API.

## Logic engine

[`src/logic.ts`](../src/logic.ts) exposes:

| Function | Responsibility |
| :--- | :--- |
| `parseFormula(input, allowed)` | Normalize supported aliases and construct an abstract syntax tree. |
| `formatFormula(node)` | Render the tree with explicit grouping. |
| `evaluate(node, values)` | Evaluate a formula for one truth assignment. |
| `grade(answer, solution, atoms)` | Return `correct`, `incorrect`, or `invalid`, with interpretation and a counterexample where applicable. |

The parser never executes user-provided code. It supports negation, conjunction, inclusive disjunction, implication, and biconditional. Ungrouped chains of implication or biconditional operators are rejected.

To bound work, formulas are limited to 1,000 characters, 300 tokens, and 64 nested unary/grouping levels. Grading supports at most eight atoms, so equivalence checking requires at most 256 truth assignments. Authored solutions are validated separately from submitted answers.

## Progress and compatibility

The storage key is **`practica-logica.progress.v1`**. It predates the Enuncia name and remains unchanged to preserve existing users' history.

The version-1 structure contains:

| Property | Contents |
| :--- | :--- |
| `version` | `1` |
| `drafts` | Exercise-keyed formula drafts, hint counts, and solution-reveal flags. |
| `attempts` | ID-keyed records with exercise ID, answer, status, help flag, timestamp, mode, and optional exam ID. |
| `exams` | Completed sessions with ten exercise IDs, saved answers, and start/end timestamps. |
| `activeExam` | One unfinished session, or `null`. |

Older version-1 files without `drafts` are accepted and normalized to an empty draft map. Unsupported versions are rejected.

`readProgress` validates imported data. `mergeProgress` merges attempts and completed exams by ID, keeps the current record on a collision, and preserves unknown exercise IDs. Current drafts and the current active exam take priority. Finished sessions cannot be restored as active.

If the active exam references exercises absent from the catalog, the app preserves it and offers to close it without grading. Do not silently replace its questions. The app also retains unparseable stored progress and can preserve it under a recovery key when importing a valid backup.

If you change the progress version or field semantics, implement an explicit migration before writing the new format. Keep stable exercise identifiers and the existing storage key unless migration code deliberately transfers the data.

## Verification

```sh
npm test
npm run build
```

For catalog changes, review the natural-language meaning in addition to automated parsing checks. The shipped tests assume an initial bank of 40 exercises split 12/16/12; update those expectations when intentionally extending the bank.

For UI or persistence changes, also check:

- A correct equivalent answer, an incorrect answer with a counterexample, and invalid syntax.
- Hint and draft persistence after a reload.
- Hidden solutions and correction before exam submission, resume behavior, blank-answer scoring, and finished-session review.
- Import merging without duplicate attempts and preservation of existing history.
- Area/block isolation, block progress counters, pagination, direct continuation, and disabled planned blocks.
- Keyboard navigation and mobile rendering without horizontal overflow.

Use a separate local port or browser profile for test sessions so that test attempts do not enter a learner's real history.
