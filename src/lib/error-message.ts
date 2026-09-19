const genericErrorMessage = "Something went wrong. Please try again.";

const curatedMessages = new Set([
  "Add at least one concept or custom topic.",
  "A material is required when using concept topics.",
  "Concept does not belong to the selected material.",
  "Concept topics require a material.",
  "This practice session is already completed.",
  "One or more answers do not belong to this session.",
  "Question does not belong to this session.",
  "This question has already been answered.",
  "You already used your submission attempt.",
  "This assignment is past due.",
  "One or more answers do not belong to this assignment.",
  "You are not a member of this class.",
  "Generate questions before assigning this assessment.",
  "Only PDF files are supported",
  "File size must be 25 MB or less",
  "Material file is not available",
  "Invalid file path",
  "Failed to remove the material file from storage.",
  "Material not found",
  "Concept not found",
  "Assessment not found",
  "Class not found",
  "Practice session not found",
  "No practice questions were generated. Please try again.",
  "Question generation is temporarily unavailable because the AI provider quota was reached. Please try again later.",
]);

export function getUserFacingErrorMessage(error: unknown) {
  if (error instanceof Error && curatedMessages.has(error.message)) return error.message;
  return genericErrorMessage;
}