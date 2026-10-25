import { google } from "@ai-sdk/google";

export const model = google("gemini-3.5-flash-lite");
export const fallbackModel = google("gemini-3.1-flash-lite");
