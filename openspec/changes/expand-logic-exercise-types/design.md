## Context

Ver proposal.md (Why). Estado actual observado:
- `Exercise` (`domain/models.ts`) tiene `atoms` y `solution` (fórmula de enunciados); `validateCatalog` exige átomos y parsea `solution` para todos los tipos.
- `exerciseTypes` (dominio) solo registra `formalization` con `grade(answer, solution, atoms)`; `editorRegistry` (shared) solo `FormulaEditor`. `PracticePanel`, `examResults`, `Statement`, `Solution` y `Feedback` asumen ese formato.
- `Attempt.answer` es `string`; `Progress.version` es 1. Los bloques de los siete apartados ya existen en `blocks.json`; `useExam` ya filtra por `e.type in exerciseTypes`.
- `tests/architecture.test.ts` impone capas: `domain` sin React ni APIs de navegador; `shared` puede usar solo `domain`.

## Goals / Non-Goals

**Goals:** un punto de extensión por tipo (datos, validación, corrector, editor, vista de enunciado/solución); respuestas serializadas a string para no tocar progreso/backup; correctores deterministas en `domain/logic` sin dependencias nuevas.

**Non-Goals:** generar demostraciones automáticamente, lógica con funciones/igualdad, migrar el progreso, internacionalización más allá del español.

## Decisions

1. **Unión discriminada por tipo.** `Exercise` pasa a campos comunes (`id, blockId, type, difficulty, title, tags, statement, hints, explanation`) más `data` específico del tipo. Para `formalization` se conserva el formato actual (`atoms`, `solution`) para no reescribir 40 ejercicios: `data` es opcional y solo lo usan los tipos nuevos. *Alternativa:* un modelo único con campos opcionales — descartada, la validación se vuelve implícita.
2. **Descriptor por tipo.** Dominio: `exerciseTypes[type] = { label, validate(exercise), grade(answer, exercise) }`. Se cambia la firma de `grade` a recibir el ejercicio completo (afecta a `PracticePanel` y `examResults`). Shared: `editorRegistry[type] = { Editor, Statement, Solution }`. Así `validateCatalog` delega la validación específica al tipo.
3. **Respuestas como string.** Tablas: cadena de `V`/`F`/`-` por celda o la opción elegida; deducción: una línea por paso `n. fórmula ; regla ; citas`; resolución: una línea por cláusula/paso; fórmulas a enunciados: id de la opción. Cada tipo define `parse/serialize`. *Alternativa:* `answer: unknown` — rompería validación de progreso y backup.
4. **Corrección semántica o estructural, no por comparación textual.** Tablas: evaluación con el motor existente (`evaluate`, ≤4 átomos en tablas completas). Deducción: comprobador de reglas que valida cada línea (acepta cualquier demostración válida). Resolución: validación de cada resolvente; en predicados, unificación con occurs-check. Fórmulas a enunciados: opción correcta marcada en datos (la equivalencia lingüística no es decidible).
5. **Lenguaje de predicados aparte.** Nuevo parser `domain/logic/predicates.ts` (AST con `pred`, `forall`, `exists`) que reutiliza tokens y límites de `parser.ts`; el parser de enunciados no cambia. Alias ASCII `forall`/`exists`, `A`/`E` NO se admiten (ambiguos con átomos).
6. **Skolemización/CNF** en `domain/logic/clauses.ts`, compartido por resolución de enunciados y predicados.
7. **Contenido:** un JSON por bloque en `src/data/content/`; los ejercicios incluyen solo datos fuente (premisas, fórmulas, conclusión); soluciones de tablas se calculan.
8. **Entrega en fases** (ver tasks.md): fundamentos → tablas → predicados/fórmulas a enunciados → deducción natural → resolución, cada fase dejando la app compilando y con tests.

## Risks / Trade-offs

- [Comprobador de deducción natural complejo, con muchas reglas y subpruebas] → empezar por enunciados, tests por regla con casos válidos e inválidos, mensajes que citan la línea.
- [Editor de demostraciones difícil de usar en móvil] → formato de texto por líneas con barra de símbolos (como `FormulaEditor`) en la primera versión; editor visual queda para después.
- [Cambiar la firma de `grade` rompe llamadas existentes] → cubrir con los tests actuales de `logic` y `exam` antes de tocar el contenido.
- [Calidad pedagógica del contenido (≥20 ejercicios × 6 bloques)] → validar cada ejercicio con su solución de autor pasando por el propio corrector en tests; revisión del usuario por bloque.
- [Explosión combinatoria en resolución/unificación] → límites de cláusulas, literales y pasos.

## Migration Plan

Sin migración de datos: el progreso `version: 1` sigue válido. Despliegue estático; reversión por git.

## Open Questions

- ¿Número final de ejercicios por bloque (se propone 20) y reparto de dificultades? No cambia la arquitectura.
