# User guide

[← Back to Enuncia](../README.md)

Enuncia currently teaches formalization in propositional logic, with atoms supplied for every exercise. Its interface and exercises are in Spanish. This guide uses the visible Spanish labels to help you find each feature.

## Start a practice session

1. Open `http://127.0.0.1:5173/` while the local server is running.
2. Choose **Practicar** from the sidebar or **Empezar a practicar** on the home page.
3. Choose an area: **Lógica de enunciados** or **Lógica de predicados**.
4. Choose an available block, such as **Formalización**. Its card shows completed, incomplete, and unattempted exercises, plus pending mistakes. Cards marked **Próximamente** are placeholders without active exercises.
5. Choose a difficulty: **Básica**, **Media**, or **Avanzada**.
6. Select an exercise from the paginated list. Each page shows at most ten exercises. Search and review filters stay within the chosen block; selecting all difficulties does not mix blocks.
7. Read the statement and supplied atoms, enter your formula, check its interpretation, and select **Comprobar**.

Use the breadcrumb to return to difficulty selection or the area's block cards. Selecting **Practicar** in the sidebar returns to the block browser. **Continuar practicando** can take you directly to your latest exercise, its level, and its page.

The home page offers **Continuar practicando** once you have a recorded attempt. Drafts and consulted hints survive navigation and page reloads.

## Enter a formula

Atoms are case-sensitive: use exactly the letters supplied by the exercise. `P` and `p` are different inputs.

| Meaning | Symbol | Keyboard input |
| :--- | :---: | :---: |
| Negation | `¬` | `~` or `!` |
| Conjunction | `∧` | `&` |
| Inclusive disjunction | `∨` | `\|` |
| Implication | `→` | `->` |
| Biconditional | `↔` | `<->` |
| Grouping | `( )` | `( )` |

You can also use the buttons above the editor. Selecting a button inserts its symbol at the current selection and returns focus to the editor.

Disjunction is inclusive unless the statement explicitly says the alternatives cannot both occur. An exclusive choice can be expressed as `(P ∨ Q) ∧ ¬(P ∧ Q)`.

### Precedence and scope

Negation binds first, followed by conjunction, then disjunction. Implication and biconditional bind after those operators. Use explicit parentheses for chains of implications or biconditionals:

```text
P → (Q → R)
(P → Q) → R
```

These formulas do not generally mean the same thing. An ungrouped chain such as `P → Q → R` is rejected so that the checker does not guess your intended scope.

The practice preview shows the fully parenthesized interpretation. Invalid symbols, unknown atoms, and missing parentheses produce an explanatory message. Formulas are limited to 1,000 characters.

## Understand the correction

The checker compares truth tables rather than formula text. A logically equivalent formula is accepted even if it uses a different arrangement or equivalent connectives.

For an incorrect formula, Enuncia displays a truth assignment where your formula and the intended formula produce different results. Use that assignment to identify the condition or connective that changed the meaning.

Syntax errors are recorded as attempts and can be corrected freely. A catalog solution that cannot be parsed is treated as an authored-content error, not a student error.

### Hints and explanations

- **Pista 1 de 2** offers an initial clue.
- **Pista 2 de 2** makes the structure more explicit.
- **Ver solución explicada** reveals the intended formula and its explanation.

Hint use is saved in the exercise draft and marks subsequent practice attempts as aided. Revealing a solution also creates a record in your history. A correct practice response displays the explained solution automatically.

## Take a mock exam

Choose **Simulacro** to prepare a session of ten distinct exercises.

| Selection | Composition |
| :--- | :--- |
| Balanced | 3 basic, 4 intermediate, and 3 advanced exercises |
| Single difficulty | 10 exercises from the selected level |

The timer is informative; there is no time limit. While answering, hints, solutions, interpretation previews, and correction are hidden. You can move between questions, change sections, or reload the page and resume your saved exam. The timer measures elapsed time from the start, including time away from the page.

Select **Entregar y ver resultados** to submit. A confirmation displays how many questions you have answered. Each exercise is worth one point; blank answers and invalid syntax receive zero points. After submission, expand each result to review your answer, the correction, and the explained solution.

Finished sessions remain available under **Mi progreso**. Only one exam can be active at a time.

## Read your progress

| Metric | Meaning |
| :--- | :--- |
| Completed exercises | Exercises with at least one correct attempt at any time. |
| First-attempt successes without help | Exercises whose first recorded attempt was correct without consulted hints or a revealed solution. |
| Pending review | Exercises whose latest record is incorrect, invalid, or a revealed solution. A later correct attempt clears the review flag. |
| History records | Submitted answers and revealed solutions, including exam answers. |

An exercise can remain completed while returning to the review list after a later mistake. A reveal counts as a recorded interaction, so a correct answer after viewing the solution is not a first-attempt success without help.

## Back up and restore your history

In **Mi progreso**:

- Choose **Exportar** to download a JSON backup.
- Choose **Importar** to select a previous backup.

Imports are validated and merged by record ID. Duplicate attempts are not added again, and the current copy takes priority when IDs overlap. Records for exercises no longer present in the catalog are retained for future use. Current drafts take priority over imported drafts. An existing active exam takes priority over an imported active exam, and a finished exam is not restored as active.

Backups contain your formulas, results, and timestamps. They are not sent to an external service. Imported files must use progress version 1 and be no larger than 10 MB.

### Keep the same origin

Progress belongs to the browser profile and origin. Keep using **`http://127.0.0.1:5173/`**. Opening the app through `localhost`, a different port, or another browser creates a separate storage context.

Clearing browser data can remove your history. Export a backup before changing browsers or clearing storage. If saving fails, the app shows a warning and lets you export the current session. If existing progress cannot be read, it is preserved; importing a valid backup saves the unreadable original under a recovery key before enabling normal saving again.

## Stop or restart the app

For the macOS launcher, keep its Terminal window open while using Enuncia. Press **Control+C** there to stop the server. Double-click `Iniciar.command` to open the app again.

For command-line use, run `npm run dev` from the project directory and stop it with **Control+C**. Restarting the server does not erase your browser history.

## Expand your practice

You can request more exercises focused on a particular topic or a new course block. For example:

> Add 15 intermediate exercises about necessary conditions, with two hints per exercise.

The current app includes formalization only. New blocks and exercise types are added through project changes; there is no automatic exercise generator inside the app.
