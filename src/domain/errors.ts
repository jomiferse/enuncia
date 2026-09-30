export type MessageCode =
  | "invalidAreas"
  | "invalidBlocks"
  | "missingExamExercise"
  | "insufficientExamExercises"
  | "duplicateBlocks"
  | "duplicateExercise"
  | "unknownBlock"
  | "exerciseTypeMismatch"
  | "unsupportedExerciseType"
  | "invalidDifficulty"
  | "incompleteExercise"
  | "invalidAtoms"
  | "tooManyAtoms"
  | "formulaRequired"
  | "formulaTooLong"
  | "unrecognizedSymbol"
  | "tooManyTokens"
  | "tooDeep"
  | "missingClosingParenthesis"
  | "expectedAtom"
  | "unknownAtom"
  | "ambiguousRelations"
  | "unexpectedElement"
  | "incompatibleProgress"
  | "invalidDraft"
  | "invalidAttempt"
  | "invalidExam"
  | "examAlreadyFinished"
  | "backupTooLarge"
  | "correctFormula"
  | "incorrectFormula";
export type MessageParams = Record<string, string | number>;

export class DomainError extends Error {
  constructor(message: string, readonly code: MessageCode, readonly params: MessageParams = {}) {
    super(message);
    this.name = new.target.name;
  }
}
