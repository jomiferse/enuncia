## Why

El curso ya declara siete bloques (deducción natural, resolución y tablas de verdad en enunciados; deducción natural, resolución y «fórmulas a enunciados» en predicados), pero solo `formalization` tiene ejercicios, corrector y editor. El resto aparece vacío y no se puede practicar. Hay que completar la app con esos bloques y sus ejercicios.

## What Changes

- Generalizar el modelo de ejercicio: hoy asume `atoms` + `solution` como fórmula de enunciados. Cada tipo definirá su propio formato de datos, validación, corrector y editor.
- Añadir lógica de predicados al lenguaje: predicados, constantes, variables y cuantificadores `∀`/`∃` (parser, formateo, validación).
- Bloque **Tablas de verdad** (enunciados): completar tabla, clasificar (tautología/contradicción/contingencia), equivalencia y validez de argumentos.
- Bloque **Deducción natural** (enunciados y predicados): demostraciones paso a paso con reglas, verificadas por un comprobador de reglas.
- Bloque **Resolución** (enunciados y predicados): paso a CNF/cláusulas, aplicación de resolución hasta la cláusula vacía; en predicados, con skolemización y unificación.
- Bloque **Fórmulas a enunciados** (predicados): interpretar una fórmula y expresarla en lenguaje natural; corrección por elección entre enunciados candidatos.
- Contenido: ejercicios por bloque (mínimo 20, repartidos en las tres dificultades), pistas y explicación, igual que formalización.
- Simulacros, progreso y estadísticas funcionan con todos los tipos.
- README y textos i18n (solo español) actualizados.

Fuera de alcance: lógica de segundo orden, modal, igualdad con funciones arbitrarias, tutor automático que genere demostraciones.

## Capabilities

### New Capabilities
- `exercise-catalog`: modelo extensible de ejercicios por tipo, validación del catálogo, práctica, simulacros y progreso para cualquier tipo.
- `truth-table-exercises`: ejercicios y corrección de tablas de verdad.
- `natural-deduction-exercises`: ejercicios de deducción natural en enunciados y predicados.
- `resolution-exercises`: ejercicios de resolución en enunciados y predicados.
- `predicate-formula-exercises`: lenguaje de predicados y ejercicios de fórmulas a enunciados.

### Modified Capabilities
<!-- openspec/specs está vacío: no hay capacidades previas que modificar. -->

## Impact

- `src/domain/models.ts`, `domain/exercises/*`, `domain/exam/*`, `domain/logic/*` (nuevos módulos de predicados, tablas, deducción, resolución).
- `src/shared/components/exercises/*` (nuevos editores y `Statement`/`Solution`/`Feedback` por tipo), `features/practice`, `features/exam`.
- `src/data/content/*.json` (un fichero por bloque), `shared/i18n/locales/es.json`, `tests/*`, `README.md`.
- Progreso en localStorage: los intentos guardan `answer` como texto; los nuevos tipos serializarán su respuesta a string para mantener `version: 1` compatible (ver design.md).
