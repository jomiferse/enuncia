import { DomainError } from "../../errors";
import { grade } from "../../logic/grading";
import { MAX_ATOMS } from "../../logic/limits";
import { parseFormula } from "../../logic/parser";
import type { Exercise } from "../../models";
import type { ExerciseTypeDefinition } from ".";
export const formalizationAtoms = (e: Exercise) => Object.keys(e.atoms ?? {});
export const formalization: ExerciseTypeDefinition = {
  label: "Formalización",
  validate(e) {
    const atoms = e.atoms ?? {};
    const names = Object.keys(atoms);
    if (
      !names.length ||
      names.length > MAX_ATOMS ||
      names.some((a) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(a) || !atoms[a]?.trim())
    )
      throw new DomainError(`Átomos no válidos: ${e.id}`, "invalidAtoms", { value1: e.id });
    parseFormula(e.solution ?? "", names);
  },
  grade: (answer, e) => grade(answer, e.solution ?? "", formalizationAtoms(e)),
};
