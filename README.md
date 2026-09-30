# Enuncia

<p align="center">
  <strong>A personal space to learn propositional logic, one statement at a time.</strong>
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-173e32?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-173e32?style=flat-square" />
  <img alt="Node 24" src="https://img.shields.io/badge/Node-24-173e32?style=flat-square" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-11.20.0-173e32?style=flat-square" />
  <img alt="Vite 7" src="https://img.shields.io/badge/Vite-7-173e32?style=flat-square" />
  <img alt="40 original exercises" src="https://img.shields.io/badge/Exercises-40-819d59?style=flat-square" />
  <img alt="Local storage" src="https://img.shields.io/badge/Progress-local-819d59?style=flat-square" />
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#what-you-can-do">Features</a> ·
  <a href="#development">Development</a> ·
  <a href="#source-architecture">Architecture</a> ·
  <a href="#internationalization">i18n</a>
</p>

---

Enuncia helps you turn natural-language statements into logical formulas and understand **why** an answer works. Practice with hints, learn from counterexamples, and prepare for your exam with focused mock sessions.

The interface and exercise bank are in **Spanish**. Repository documentation is in English.

## What you can do

| | What Enuncia offers |
| :--- | :--- |
| **Guided practice** | 40 original exercises organized by area, block, and level, with supplied atoms, progressive hints, and explained solutions. |
| **Meaningful correction** | Truth-table equivalence checking accepts different formulas with the same meaning. Incorrect answers receive a concrete counterexample. |
| **Flexible input** | Use the symbol buttons or type `~`, `!`, `&`, `\|`, `->`, and `<->`. |
| **Mock exams** | Ten distinct exercises, an informative timer, saved answers, and a full review after submission. |
| **Personal progress** | Track attempts, first-attempt successes without help, and mistakes to revisit. Export and import backups. |
| **Room to grow** | Browse course areas and block progress cards; add exercises through JSON files as your course progresses. |

### A course structure that grows with you

**Area → Block → Difficulty → Exercises.** The practice screen starts with block cards and progress counters instead of a flat exercise list. Each level displays ten exercises per page.

- **Propositional logic:** Formalization is available. Natural deduction, resolution, and truth tables have clearly marked planned cards.
- **Predicate logic:** Formalization, natural deduction, and resolution have planned cards for future content.

Planned blocks contain no exercises and cannot be opened for practice. Adding content and its required editor/grader makes a block available.

### Formalization: three difficulty levels

| Basic | Intermediate | Advanced |
| :---: | :---: | :---: |
| **12 exercises** | **16 exercises** | **12 exercises** |
| Connectives and simple conditions | Necessary and sufficient conditions, scope, and exceptions | Nested implications and conditions about other rules |

## Quick start

Use **Node.js 24**, as specified in [`.nvmrc`](.nvmrc), and **pnpm 11.20.0**, pinned by `packageManager` in [`package.json`](package.json).

With pnpm installed and nvm available:

```sh
git clone https://github.com/jomiferse/enuncia.git
cd enuncia
nvm install
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

If you manage Node without nvm, select Node 24 before running the pnpm commands.

Open **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)** in your browser. Stop the server with **Ctrl+C**.

[`pnpm-lock.yaml`](pnpm-lock.yaml) locks the dependency versions. [`pnpm-workspace.yaml`](pnpm-workspace.yaml) permits the esbuild installation script required by the build tools.

### Open on a phone

Connect the phone and computer to the same local network, stop the running server, and restart it with:

```sh
pnpm dev --host 0.0.0.0
```

On the phone, open `http://<computer-local-ip>:5173/`. The normal `pnpm dev` command binds to `127.0.0.1`, so it is accessible only from the computer.

Both modes use port **5173** and fail if that port is occupied. Access through a network IP uses a different browser storage origin; import a progress backup if needed.

## A first exercise

Suppose the supplied atoms are:

- `P`: I study the theory.
- `Q`: I solve exercises.

For **“I study the theory and solve exercises”**, both `P ∧ Q` and `Q & P` are accepted: they have the same truth table.

If you submit `P ∨ Q`, Enuncia can show a counterexample:

| P | Q | Your formula: P ∨ Q | Expected: P ∧ Q |
| :---: | :---: | :---: | :---: |
| True | False | True | False |

This tells you exactly where the meaning differs. The in-app **Guía rápida** explains notation, hints, mock exams, and progress tracking.

## Your progress stays local

Enuncia stores attempts, drafts, consulted hints, and the active mock exam in your browser's `localStorage`. The app requires no account, API key, or remote service, and works offline after its dependencies have been installed and the local server is running.

Use the same browser profile and **`http://127.0.0.1:5173/`** to keep accessing your history. `localhost`, another port, or another browser has separate storage. Back up your progress through **Mi progreso → Exportar** and restore it with **Importar**.

The storage key remains `practica-logica.progress.v1` and the backup format remains version **1**. Imports merge history without duplicating attempts or restoring an already completed exam. Unknown exercise IDs are preserved. Invalid local data is not overwritten; a recovery import keeps a copy of the original stored value.

## Development

| Command | Purpose |
| :--- | :--- |
| `pnpm dev` | Start the local development server on port 5173. |
| `pnpm test` | Run domain, storage, i18n, and architecture tests. |
| `pnpm typecheck` | Type-check the application and tests, including unused code checks. |
| `pnpm build` | Type-check the app and build the static site into `dist/`. |
| `pnpm preview` | Serve the built site on the same local address and port. |

Before submitting a change, run:

```sh
pnpm typecheck
pnpm test
pnpm build
```

The test suite covers parsing and equivalence, catalog content, course filtering and pagination, balanced exam selection and grading, progress merging, storage recovery, Spanish translations and plurals, and dependency boundaries. Type checking includes both application and test files and rejects unused locals and parameters.

### Source architecture

```text
src/
  app/                 App composition, navigation, and layout
  domain/              Pure business rules, models, and error codes
    course/            Course validation, filtering, and pagination
    exam/              Selection, configuration, and grading
    exercises/         Exercise validation and type registry
    logic/             Parser, evaluation, grading, and limits
    progress/          Validation, immutable state updates, and statistics
  data/
    catalog.ts         Loads and validates the course catalog
    content/           Areas, blocks, and authored exercise JSON
  infrastructure/
    browser/           Local storage and JSON backup files
  features/            Home, guide, practice, exam, and progress screens
  shared/
    components/        Reusable UI and formula editors
    i18n/              Configuration, typed resources, and message adapters
    utils/             Presentation helpers
  styles/              Ordered styles by section and responsive breakpoint
  main.tsx             React entry point
```

`app/App.tsx` composes the feature sessions and navigation. Hooks stay mounted across screen changes to preserve unfinished practice and exams. Feature components separate course stages, exercise lists, exam setup, active sessions, submission dialogs, history, and backup controls.

Dependency direction is explicit: `domain` depends only on domain modules; `data` and `infrastructure` depend on the domain; shared UI depends on shared components and domain types. Features connect these modules, and the app composes the features. Browser access lives in `infrastructure/browser`; grading and progress rules can run without React or a browser. `tests/architecture.test.ts` enforces these boundaries.

CSS is split into focused files imported from `styles/index.css`. Import order preserves the original cascade and responsive behavior. Keep that ordering when adding overrides.

To support a new exercise type, register its grader and label in `domain/exercises/registry.ts` and its editor in `shared/components/exercises/registry.ts`. Add content in `data/content/`, preserving existing exercise IDs. Shared formula and exam limits live in the domain.

### Internationalization

The UI uses i18next and react-i18next with type-checked translation keys. Spanish (`es`) is currently the only supported language and the default fallback; no language detector or selector is enabled. Resources are bundled locally, so translation does not require a network request.

- [`locales/es.json`](src/shared/i18n/locales/es.json) contains interface copy, accessible labels, interpolated messages, plurals, and correction/error text.
- [`config.ts`](src/shared/i18n/config.ts) initializes the instance and declares the supported languages and bundled resources.
- [`i18next.d.ts`](src/shared/i18n/i18next.d.ts) provides typed translation keys.
- [`messages.ts`](src/shared/i18n/messages.ts) translates domain error and grading codes.
- [`useDifficultyLabels.ts`](src/shared/i18n/useDifficultyLabels.ts) provides translated level names.

The React entry point supplies `I18nextProvider` and sets the document language. Components use `useTranslation()`; date formatting uses the active locale. Domain errors retain diagnostic messages plus codes and parameters without importing i18n or React.

Course statements, atoms, hints, explanations, and area/block descriptions remain authored Spanish content in `src/data/content/`. To add another UI language later, add its matching catalog to the resources and supported languages in `config.ts`; course content requires separate localization. Keep translation keys stable when editing copy.

## Project background

The original exercises are inspired by the style and difficulty progression of **[ALURA](https://eimtlogica.uoc.edu/alura/)**, the UOC logic learning assistant. Enuncia is an independent project and does not connect to, submit answers to, or modify ALURA assessments.

<p align="center"><sub>Think clearly. Practice deliberately. Keep learning.</sub></p>
