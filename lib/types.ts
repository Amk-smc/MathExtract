export type InputType = "photo" | "pdf";
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
  inputType: InputType | null;
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
        inputType: InputType;
        layoutPreference: LayoutPreference;
        imageDataUrl: string | null;
      };
    }
  | { type: "SET_INPUT_TYPE"; payload: AppState["inputType"] }
  | { type: "SET_LAYOUT"; payload: AppState["layoutPreference"] }
  | { type: "SET_IMAGE"; payload: string | null }
  | { type: "SET_PROBLEMS"; payload: AppState["problems"] }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_PROBLEM"; payload: Problem }
  | { type: "DELETE_PROBLEM"; payload: string }
  | { type: "ADD_PROBLEM"; payload: Problem }
  | { type: "RESET" };
