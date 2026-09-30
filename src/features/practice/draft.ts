import type { PracticeDraft } from "../../domain/models";
export const blankDraft = (): PracticeDraft => ({
  answer: "",
  hints: 0,
  revealed: false,
});
