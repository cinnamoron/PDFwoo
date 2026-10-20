import { google } from "@ai-sdk/google";

export const model = google("gemini-3.1-flash-lite-preview");
export const fallbackModel = google("gemini-2.5-flash-lite");
