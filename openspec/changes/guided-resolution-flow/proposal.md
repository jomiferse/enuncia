## Why

La resolución actual de Enuncia pide escribir cláusulas y pasos de resolución como texto libre. ALURA (UOC), la referencia de la asignatura, la enseña como un proceso guiado: pasar premisas y negación de la conclusión a forma normal con la ley aplicada en cada paso, simplificar el conjunto de cláusulas, construir el árbol de resolución y concluir sobre la validez y la consistencia. Practicar ese método completo es lo que se evalúa, y hoy no se puede.

## What Changes

- Reemplazar el tipo `resolution` por un ejercicio guiado «premisas ⊢ conclusión» con cinco fases, tanto en enunciados como en predicados:
  1. **FNC / FNS**: cada premisa y la negación de la conclusión se reescriben paso a paso, indicando la ley aplicada (condicional, De Morgan, doble negación, distributiva, idempotencia, absorción, complementarios, neutros; en predicados además ¬∀/¬∃, renombrar variable ligada, mover ∀ a la izquierda y Skolem), hasta marcar «FNC» (o «FNS»).
  2. **Conjunto de cláusulas**: simplificarlo (subsunción, literal puro, cláusulas repetidas o tautológicas) hasta «no se puede simplificar más».
  3. **Árbol de resolución**: decidir si es posible y, en ese caso, construirlo eligiendo cláusula troncal, cláusula lateral y literal complementario hasta llegar a □ (en predicados, con unificación).
  4. **Conclusión**: el razonamiento es válido o no válido.
  5. **Consistencia de las premisas**: repetir las fases 2–3 solo con las premisas y concluir consistentes o inconsistentes.
- Feedback paso a paso («Correcto» o motivo del error, sin revelar la solución), pistas y solución explicada, en el estilo de Enuncia: español, ritmo propio, progreso local, móvil y modo oscuro.
- Sustituir los 45 ejercicios actuales de resolución por ≥20 por bloque en el nuevo formato (enunciados propios, no copiados de ALURA).
- Eliminar el código y los tests del formato por texto libre que dejan de usarse.
- **BREAKING**: el formato de respuesta de `resolution` cambia; los intentos antiguos de resolución siguen guardados pero ya no corresponden a ejercicios existentes.

Fuera de alcance: crear ejercicios propios del usuario, bicondicional (↔) en los ejercicios, deducción natural y demás bloques, exportación del árbol como imagen.

## Capabilities

### New Capabilities
- `guided-resolution`: flujo guiado de resolución (FNC/FNS, simplificación, árbol, validez y consistencia) para enunciados y predicados.

### Modified Capabilities
<!-- openspec/specs está vacío porque `expand-logic-exercise-types` aún no se ha archivado; ver design.md sobre el orden de archivado. -->

## Impact

- `src/domain/logic/*` (nuevos motores de reescritura, simplificación y árbol; se reutilizan `clauses`, `predicates`, `unification`, `predicate-clauses`), `src/domain/exercises/types/resolution.ts`, `src/domain/logic/limits.ts`.
- `src/shared/components/exercises/types/resolution.tsx` (nuevo editor por fases), `src/styles/resolution.css`, `src/shared/i18n/locales/es.resolution.json`.
- `src/data/content/enunciados-resolucion.json`, `predicados-resolucion.json`, tests de resolución, README.
