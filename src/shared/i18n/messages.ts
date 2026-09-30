import { DomainError, type MessageCode, type MessageParams } from "../../domain/errors";
import type { Grade } from "../../domain/logic/grading";
import { translate } from "./config";

export function translateMessage(code: MessageCode, params: MessageParams = {}): string {
  return translate(`errors.${code}`, params);
}

export function translateError(error: unknown): string {
  if (error instanceof SyntaxError) return translate("errors.invalidJson");
  if (error instanceof DomainError) return translateMessage(error.code, error.params);
  return error instanceof Error ? error.message : String(error);
}

export function translateGrade(result: Grade): string {
  return translateMessage(result.messageCode, result.messageParams);
}
