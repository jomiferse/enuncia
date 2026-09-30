import type { Block, Difficulty, Exercise } from "./types";
import { parseFormula } from "./logic";
import blocksData from "./content/blocks.json";
export const difficultyLabels: Record<Difficulty, string> = {
  basica: "Básica",
  media: "Media",
  avanzada: "Avanzada",
};
export const exerciseTypes = { formalization: { label: "Formalización" } };
export function validateCatalog(blocks: Block[], exercises: Exercise[]) {
  const ids = new Set<string>();
  const blockIds = new Set(blocks.map((b) => b.id));
  if (blockIds.size !== blocks.length)
    throw new Error("Hay bloques con identificadores repetidos.");
  for (const e of exercises) {
    if (!e.id || ids.has(e.id))
      throw new Error(`Identificador repetido o vacío: ${e.id}`);
    ids.add(e.id);
    if (!blockIds.has(e.blockId))
      throw new Error(`Bloque desconocido: ${e.blockId}`);
    if (!Object.hasOwn(exerciseTypes, e.type))
      throw new Error(`Tipo no registrado: ${e.type}`);
    if (!Object.hasOwn(difficultyLabels, e.difficulty))
      throw new Error(`Dificultad no válida: ${e.id}`);
    if (
      !e.title?.trim() ||
      !e.statement?.trim() ||
      !e.explanation?.trim() ||
      e.hints?.length !== 2 ||
      e.hints.some((h) => !h.trim()) ||
      !Array.isArray(e.tags)
    )
      throw new Error(`Contenido incompleto: ${e.id}`);
    const atoms = Object.keys(e.atoms ?? {});
    if (
      !atoms.length ||
      atoms.length > 8 ||
      atoms.some(
        (a) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(a) || !e.atoms[a]?.trim(),
      )
    )
      throw new Error(`Átomos no válidos: ${e.id}`);
    parseFormula(e.solution, atoms);
  }
}
export const blocks = blocksData as Block[];
const files = import.meta.glob<Exercise[]>("./content/*.json", {
  eager: true,
  import: "default",
});
export const exercises = Object.entries(files)
  .filter(([path]) => !path.endsWith("/blocks.json"))
  .flatMap(([, data]) => data);
validateCatalog(blocks, exercises);
export const exerciseById: Record<string, Exercise> = Object.assign(
  Object.create(null),
  Object.fromEntries(exercises.map((e) => [e.id, e])),
);
