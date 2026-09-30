import { validateCourse } from "../domain/course/validation";
import { validateCatalog } from "../domain/exercises/validation";
import type { Area, Block, Exercise } from "../domain/models";
import areasData from "./content/areas.json";
import blocksData from "./content/blocks.json";
export const areas = areasData as Area[];
export const blocks = blocksData as Block[];
validateCourse(areas, blocks);
const files = import.meta.glob<Exercise[]>("./content/*.json", {
  eager: true,
  import: "default",
});
export const exercises = Object.entries(files)
  .filter(
    ([path]) =>
      !["blocks.json", "areas.json"].some((name) => path.endsWith(`/${name}`)),
  )
  .flatMap(([, data]) => data);
validateCatalog(blocks, exercises);
export const exerciseById: Record<string, Exercise> = Object.assign(
  Object.create(null),
  Object.fromEntries(exercises.map((e) => [e.id, e])),
);
