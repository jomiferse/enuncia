import type { Exercise } from "../../../domain/models";
import { editorRegistry } from "./registry";
export function Statement({ exercise }: { exercise: Exercise }) {
  const Component = editorRegistry[exercise.type].Statement;
  return <Component exercise={exercise} />;
}
