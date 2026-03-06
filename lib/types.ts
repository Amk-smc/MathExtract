/**
 * lib/types.ts
 *
 * Shared TypeScript types for the app: LayoutPreference, Problem, AppState, and
 * all AppAction variants used by the reducer (SET_STEP, SET_FILE, SET_PROBLEMS, etc.).
 */

export type LayoutPreference = "beside" | "below";

export type Problem = {
  id: string;
  label: string; // e.g. "Problem 3"
  text: string; // Full problem text
  figures: string[]; // e.g. ["Fig 2.6", "Fig 3.1"]
  figureImages: Record<string, string>; // figureRef -> base64 data URL
  confirmed: boolean;
};

export type AppState = {
  step: "upload" | "detecting" | "verify" | "figures" | "generating" | "done";
  layoutPreference: LayoutPreference;
  imageDataUrl: string | null; // base64 of uploaded image for display + cropping
  problems: Problem[];
  error: string | null;
};

export type AppAction =
  | { type: "SET_STEP"; payload: AppState["step"] }
  | {
      type: "SET_FILE";
      payload: {
        layoutPreference: LayoutPreference;
        imageDataUrl: string;
      };
    }
  | { type: "SET_LAYOUT"; payload: LayoutPreference }
  | { type: "SET_PROBLEMS"; payload: AppState["problems"] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_PROBLEM"; payload: Problem }
  | { type: "DELETE_PROBLEM"; payload: string }
  | { type: "ADD_PROBLEM"; payload: Problem }
  | { type: "RESET" };
