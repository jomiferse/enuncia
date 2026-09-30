import { FormulaEditor } from "./FormulaEditor";

export const editorRegistry: Record<string, { Editor: typeof FormulaEditor }> = {
  formalization: { Editor: FormulaEditor },
};
