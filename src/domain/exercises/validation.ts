import { DomainError } from "../errors";
import type { Block, Exercise } from "../models";
import { difficultyLabels, exerciseTypes } from "./registry";
export function validateCatalog(blocks: Block[], exercises: Exercise[]) {
  const ids = new Set<string>();
  const blockIds = new Set(blocks.map((b) => b.id));
  if (blockIds.size !== blocks.length)
    throw new DomainError("Hay bloques con identificadores repetidos.", "duplicateBlocks");
  for (const e of exercises) {
    if (!e.id || ids.has(e.id))
      throw new DomainError(`Identificador repetido o vacío: ${e.id}`, "duplicateExercise", { value1: e.id });
    ids.add(e.id);
    if (!blockIds.has(e.blockId))
      throw new DomainError(`Bloque desconocido: ${e.blockId}`, "unknownBlock", { value1: e.blockId });
    if (blocks.find((b) => b.id === e.blockId)?.type !== e.type)
      throw new DomainError(`El tipo del ejercicio no coincide con su bloque: ${e.id}`, "exerciseTypeMismatch", { value1: e.id });
    if (!Object.hasOwn(exerciseTypes, e.type))
      throw new DomainError(`Tipo no registrado: ${e.type}`, "unsupportedExerciseType", { value1: e.type });
    if (!Object.hasOwn(difficultyLabels, e.difficulty))
      throw new DomainError(`Dificultad no válida: ${e.id}`, "invalidDifficulty", { value1: e.id });
    if (
      !e.title?.trim() ||
      !e.statement?.trim() ||
      !e.explanation?.trim() ||
      e.hints?.length !== 2 ||
      e.hints.some((h) => !h.trim()) ||
      !Array.isArray(e.tags)
    )
      throw new DomainError(`Contenido incompleto: ${e.id}`, "incompleteExercise", { value1: e.id });
    exerciseTypes[e.type].validate(e);
  }
}
