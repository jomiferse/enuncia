## 1. Núcleo de enunciados

- [x] 1.1 Motor de leyes de reescritura de un paso (condicional, De Morgan, doble negación, distributiva, idempotencia, complementarios, neutros, absorción), comparación módulo asociatividad/conmutatividad y comprobación de FNC, con tests por ley (válidos e inválidos). Verificar: `pnpm test`.
- [x] 1.2 Simplificación de conjuntos de cláusulas (subsunción, literal puro, tautológica, repetida) con «no se puede simplificar más» y árbol de resolución lineal con resolvente calculado, más validez y consistencia semánticas. Verificar: `pnpm test`.
- [x] 1.3 Esquema de respuesta JSON por fases, corrector que devuelve `Grade.details` por paso, desbloqueo de fases y respuesta vacía como `invalid`; subir `MAX_ANSWER_LENGTH` y probar progreso/backup con respuestas largas. Verificar: `pnpm test` y `pnpm typecheck`.

## 2. Interfaz y contenido de enunciados

- [x] 2.1 Reescribir el editor/enunciado/solución de `resolution` con tarjetas por fase, chips de leyes, campo de fórmula con símbolos, selección de troncal/lateral/literal y estados por paso; textos en `es.resolution.json`; modo oscuro y móvil. Verificar: prueba manual en `pnpm dev` (escritorio y 375 px) y `pnpm build`.
- [x] 2.2 Sustituir `enunciados-resolucion.json` por ≥20 ejercicios nuevos con solución de referencia por fases; test que valida el bloque con `validateCatalog` y comprueba que la solución de referencia es correcta y una alterada no. Verificar: `pnpm test`.

## 3. Núcleo de predicados

- [x] 3.1 Leyes de predicados (¬∀, ¬∃, renombrar variable ligada, mover ∀ a la izquierda, skolemización con símbolos nuevos, FNS) reutilizando `predicates.ts` y `predicate-clauses.ts`, con tests. Verificar: `pnpm test`.
- [x] 3.2 Simplificación y árbol con renombrado, unificador más general y occurs-check, y validez/consistencia procedentes de los datos del ejercicio; integración en el esquema y corrector comunes. Verificar: `pnpm test`.

## 4. Interfaz y contenido de predicados

- [x] 4.1 Adaptar el editor a predicados (leyes de cuantificadores, signatura, resolvente con sustitución mostrada). Verificar: prueba manual y `pnpm build`.
- [x] 4.2 Sustituir `predicados-resolucion.json` por ≥20 ejercicios nuevos con solución de referencia y datos `valid`/`consistent`; test de catálogo y de solución de referencia. Verificar: `pnpm test`.

## 5. Limpieza e integración

- [x] 5.1 Eliminar el código y los tests del formato por texto libre sin uso (`checkRefutation`, `checkClauseConversion`, `predicate-resolution` y sus tests), conservar lo reutilizable y comprobar que simulacros mixtos y estadísticas siguen pasando. Verificar: `pnpm typecheck`, `pnpm test` y `pnpm build`.
- [x] 5.2 Actualizar README, textos de Guía/Inicio sobre resolución y claves i18n huérfanas. Verificar: `tests/i18n.test.ts` y revisión manual.

## Workflow follow-up

- Archivar primero `expand-logic-exercise-types`, después sincronizar esta change y marcar como sustituidos los requisitos de formato por texto de `resolution-exercises`.
