/**
 * lib/types.ts
 *
 * Shared TypeScript types for the app: LayoutPreference, Problem, PageImage,
 * AppState, and all AppAction variants used by the reducer.
 */

export type LayoutPreference = "beside" | "below";

/** One uploaded page (image) in the multi-page flow */
export type PageImage = {
  id: string;
  dataUrl: string;
  filename: string;
  status: "pending" | "detecting" | "done" | "error";
  error?: string;
};

export type Problem = {
  id: string;
  label: string; // e.g. "Problem 3"
  text: string; // Full problem text
  figures: string[]; // e.g. ["Fig 2.6", "Fig 3.1"]
  figureImages: Record<string, string>; // figureRef -> base64 data URL
  confirmed: boolean;
  pageLabel?: string; // e.g. "Page 1" when from multi-page upload
  pageId?: string; // matches PageImage.id for correct image lookup in FigureStep
};

export type AppState = {
  step: "upload" | "detecting" | "verify" | "figures" | "generating" | "done";
  layoutPreference: LayoutPreference;
  pages: PageImage[];
  imageDataUrl: string | null; // first page data URL for figure cropping (LassoCrop)
  problems: Problem[];
  error: string | null;
};

export type AppAction =
  | { type: "SET_STEP"; payload: AppState["step"] }
  | {
      type: "SET_FILE";
      payload: {
        layoutPreference: LayoutPreference;
        imageDataUrl: string | null;
        pages: PageImage[];
      };
    }
  | { type: "SET_PAGES"; payload: PageImage[] }
  | {
      type: "UPDATE_PAGE_STATUS";
      payload: {
        id: string;
        status: PageImage["status"];
        error?: string;
      };
    }
  | { type: "SET_LAYOUT"; payload: LayoutPreference }
  | { type: "SET_PROBLEMS"; payload: AppState["problems"] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_PROBLEM"; payload: Problem }
  | { type: "DELETE_PROBLEM"; payload: string }
  | { type: "ADD_PROBLEM"; payload: Problem }
  | { type: "RESET" };
