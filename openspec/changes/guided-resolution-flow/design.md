## Context

Ver proposal.md (Why). Observado en ALURA (sesión del usuario, solo lectura): para «premisas ∴ conclusión» el asistente pide (1) FNC/FNS por premisa y por la negación de la conclusión, cada paso con ley + resultado y resaltando dónde se aplicó; (2) simplificación del conjunto de cláusulas (subsunción, literal puro, «no se puede simplificar más»); (3) pregunta «¿es posible un árbol de resolución?» y tabla troncal/lateral/acción hasta □; (4) «razonamiento VÁLIDO/NO VÁLIDO»; (5) lo mismo para las premisas solas y «CONSISTENTES/INCONSISTENTES». Leyes ofrecidas en enunciados: A→B, De Morgan ×2, ¬¬A, distributiva ∨/∧, idempotencia ∧/∨, complementarios ∧/∨, neutros, absorción ×2; en predicados además ¬∀, ¬∃, mover ∀ a la izquierda, Skolem, renombrar variable ligada y FNS. No hay ley para ↔.

Estado actual de Enuncia (change `expand-logic-exercise-types`, aún sin archivar): `resolution` acepta texto libre (`clausify`/`refute`), con `clauses.ts`, `resolution.ts`, `unification.ts`, `predicate-clauses.ts` (skolemización, isomorfismo), `predicate-resolution.ts`, editor `types/resolution.tsx`, 45 ejercicios y tests. La respuesta de cualquier tipo es un `string` (`MAX_ANSWER_LENGTH` = 5000) y el simulacro considera «sin responder» una respuesta vacía o de guiones.

## Goals / Non-Goals

**Goals:** reproducir el método de ALURA con la filosofía de Enuncia (feedback calmado, pistas, solución explicada, borrador local, móvil/oscuro); corrector determinista que valide cada paso por reescritura estructural; reutilizar los motores de cláusulas, unificación y skolemización existentes.

**Non-Goals:** ejercicios propios del usuario, ↔, copiar ejercicios de ALURA, demostrar automáticamente por el usuario.

## Decisions

1. **Un solo tipo `resolution`, formato nuevo.** `data`: `language` (`propositional|predicate`), `premises[]`, `conclusion`, `atoms` o `signature`, y para predicados `valid` y `consistent` (revisados a mano, porque la refutabilidad en predicados no es decidible en general). En enunciados, validez y consistencia se calculan por evaluación (≤8 átomos). *Alternativa:* conservar `clausify`/`refute` como tareas sueltas — descartada por el usuario: se reemplazan.
2. **Respuesta = JSON serializado.** Objeto por fases (`nf`, `set`, `tree`, `verdict`, `consistency`), con cada paso `{law, result}`/`{kind, result}`/`{trunk, side, literals}`. Se sube `MAX_ANSWER_LENGTH` a 20000. Un estado vacío se serializa como `""` para que «sin responder» siga funcionando. *Alternativa:* formato por líneas de texto como deducción — descartada: la estructura (selección de ley, cláusula, literal) es más fiable como datos.
3. **Corrector por reescritura de un paso.** Cada ley es una función que genera todos los resultados de aplicarla una vez en cualquier subfórmula; el paso es correcto si el resultado escrito (parseado) coincide, módulo asociatividad y conmutatividad de ∧/∨, con alguno. Así se admite cualquier posición, como ALURA, sin pedirla. «FNC/FNS» se valida comprobando la forma. Skolem reutiliza la skolemización de `predicate-clauses.ts` comprobando símbolos nuevos y argumentos.
4. **Simplificación y árbol.** La simplificación se valida generando las aplicables (subsunción, literal puro, tautológica, repetida) y comprobando que el resultado coincide con la indicada; «no se puede simplificar más» exige que no quede ninguna. El árbol es lineal (el resolvente es la troncal siguiente): el usuario elige troncal inicial, lateral y literales; el sistema calcula el resolvente (en predicados: renombrar, mgu, occurs-check con `unification.ts`). «No es posible» se valida por satisfacibilidad (enunciados) o por el dato `valid`/`consistent` (predicados). *Alternativa:* resolución general no lineal — se pospone; los ejercicios se eligen para que exista refutación lineal.
5. **Fases desbloqueadas progresivamente**, con el conjunto de partida de cada fase calculado de los resultados correctos de la anterior (no reescrito por el usuario), como en ALURA. La corrección es global al pulsar «Comprobar» (estado `correct` solo si todo es correcto); el detalle por paso se devuelve en `Grade.details` y el editor lo pinta paso a paso. Sin feedback en simulacro.
6. **UI por fases en un único panel**: tarjetas por fase, selector de ley como chips, campo de fórmula con la barra de símbolos existente, resultado en línea, botón «Añadir paso» y borrar último; sin diálogos modales. Mantiene variables de tema y diseño responsive actuales.
7. **Contenido nuevo**: ≥20 ejercicios por bloque en JSON con solución de referencia (pasos completos) que valida el propio corrector en tests; escritos como variaciones propias de problemas típicos (modus ponens/tollens, silogismos, dilemas, cuantificadores).
8. **Limpieza**: se eliminan `checkRefutation`, `checkClauseConversion`, `predicate-resolution` de texto libre y sus tests/ejercicios cuando nada los use; `clauses.ts`, `unification.ts` y `predicate-clauses.ts` se conservan en lo reutilizable.
9. **Orden de archivado:** archivar primero `expand-logic-exercise-types` (crea las specs principales, incluida `resolution-exercises`), después sincronizar esta change y marcar como sustituidos los requisitos de formato por texto de `resolution-exercises`.

## Risks / Trade-offs

- [Equivalencia estructural estricta rechaza pasos válidos con otra forma] → comparar módulo asociatividad/conmutatividad y duplicados triviales, mensajes que muestren qué ley y qué esperaba sin dar el resultado.
- [Validez/consistencia en predicados no decidibles] → datos revisados en el ejercicio, con test que contrasta la refutación de referencia.
- [Respuestas JSON más grandes (20k)] → límite razonable y validación de longitud en el progreso/backup.
- [UI compleja en móvil] → tarjetas apiladas, chips con scroll, probar en ancho 375.
- [Cambio de formato rompe el historial de resolución] → los intentos antiguos siguen almacenados; no se reinterpretan.
- [Árbol lineal puede no cubrir todo lo que ALURA acepta] → elegir ejercicios con refutación lineal y documentarlo.

## Migration Plan

Sin migración de datos. Reemplazo directo del tipo `resolution`; reversión por git.

## Open Questions

- ¿Hay que admitir resolución no lineal más adelante (elegir cualquier par de cláusulas disponibles)? No afecta a los ejercicios actuales.
