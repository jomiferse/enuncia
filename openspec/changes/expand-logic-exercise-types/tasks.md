## 1. Fundamentos del catálogo por tipos

- [x] 1.1 Añadir `data` opcional a `Exercise`, cambiar `grade` a recibir el ejercicio y dar a `exerciseTypes` los métodos `validate`/`grade`; adaptar `PracticePanel`, `examResults` y `validateCatalog`. Verificar: `pnpm typecheck` y `pnpm test` pasan sin cambios de comportamiento en formalización.
- [x] 1.2 Extender `editorRegistry` con `Editor`, `Statement` y `Solution` por tipo y usarlos en práctica, simulacro, feedback y progreso. Verificar: formalización se ve igual y test de catálogo con un tipo de prueba.
- [x] 1.3 Nuevos `MessageCode` y claves i18n para errores de tipos nuevos. Verificar: `tests/i18n.test.ts` pasa.

## 2. Tablas de verdad

- [x] 2.1 Módulo de dominio de tablas (generación de filas, clasificación, equivalencia, validez) con límite de 4 átomos y tests unitarios. Verificar: `pnpm test`.
- [x] 2.2 Editor/Statement/Solution de tablas (celdas V/F, opciones) y corrector con mensajes por fila. Verificar: test de corrección y prueba manual en `pnpm dev`.
- [x] 2.3 Escribir `tablas-verdad.json` (≥20 ejercicios, 3 dificultades, 2 pistas y explicación) y test que valida todo el bloque. Verificar: `pnpm test` y el bloque se abre en la app.

## 3. Lenguaje de predicados y fórmulas a enunciados

- [x] 3.1 Parser, formateo y validación de aridades para predicados con cuantificadores, con límites y tests (válidas, aridad, símbolos). Verificar: `pnpm test`.
- [x] 3.2 Tipo `formula-to-statement`: datos (fórmula, diccionario, opciones, correcta), editor de opciones, corrector y explicación. Verificar: test de corrector y prueba manual.
- [x] 3.3 Escribir `predicados-formulas-enunciados.json` (≥20 ejercicios). Verificar: `pnpm test`.

## 4. Deducción natural

- [x] 4.1 Comprobador de reglas de enunciados con subpruebas y RAA, y formato de respuesta por líneas con tests por regla. Verificar: `pnpm test`.
- [x] 4.2 Extender a predicados (∀I/∀E/∃I/∃E con restricciones) con tests de restricciones. Verificar: `pnpm test`.
- [x] 4.3 Editor de demostración (líneas, barra de reglas y símbolos), Statement/Solution con la demostración del autor y mensajes por línea. Verificar: prueba manual y test de corrector.
- [x] 4.4 Escribir `enunciados-deduccion-natural.json` y `predicados-deduccion-natural.json` (≥20 c/u); test que valida las demostraciones de autor con el propio comprobador. Verificar: `pnpm test`.

## 5. Resolución

- [x] 5.1 Conversión a CNF/cláusulas y comprobador de resolvente y refutación en enunciados con tests. Verificar: `pnpm test`.
- [x] 5.2 Skolemización, unificación (occurs-check) y resolución de predicados, con límites, y tests. Verificar: `pnpm test`.
- [x] 5.3 Editor de cláusulas/pasos, Statement/Solution y mensajes. Verificar: prueba manual y test de corrector.
- [x] 5.4 Escribir `enunciados-resolucion.json` y `predicados-resolucion.json` (≥20 c/u) validados con el corrector. Verificar: `pnpm test`.

## 6. Integración y documentación

- [x] 6.1 Simulacros con tipos mezclados, estadísticas y backup con intentos de todos los tipos. Verificar: tests de exam/progress/storage ampliados.
- [x] 6.2 Actualizar README (nº de ejercicios, bloques), textos de Inicio/Guía y estilos responsive de los nuevos editores. Verificar: `pnpm build` y revisión en móvil/escritorio.
