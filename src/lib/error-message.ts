import { CURATED_ERROR_MESSAGES } from "./curated-error-messages";

const genericErrorMessage = "Something went wrong. Please try again.";

export function getUserFacingErrorMessage(error: unknown) {
  if (error instanceof Error && CURATED_ERROR_MESSAGES.has(error.message))
    return error.message;
  return genericErrorMessage;
}
