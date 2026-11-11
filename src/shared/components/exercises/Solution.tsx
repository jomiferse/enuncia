import type { Exercise } from "../../../domain/models";
import { editorRegistry } from "./registry";
export function Solution({ exercise }: { exercise: Exercise }) {
  const Component = editorRegistry[exercise.type].Solution;
  return <Component exercise={exercise} />;
}
