import { DomainError } from "../errors";
import type { Area, Block } from "../models";
export function validateCourse(areas: Area[], blocks: Block[]) {
  const areaIds = new Set(areas.map((a) => a.id));
  if (
    !areas.length ||
    areaIds.size !== areas.length ||
    areas.some((a) => !a.id || !a.title || !a.description || !a.symbol)
  )
    throw new DomainError("Las áreas deben tener identificadores únicos y contenido completo.", "invalidAreas");
  const blockIds = new Set(blocks.map((b) => b.id));
  if (
    blockIds.size !== blocks.length ||
    blocks.some(
      (b) =>
        !b.id ||
        !areaIds.has(b.areaId) ||
        !b.title ||
        !b.subtitle ||
        !b.description ||
        !b.type,
    )
  )
    throw new DomainError("Los bloques deben tener identificadores únicos, un área registrada y contenido completo.", "invalidBlocks");
}
