/**
 * components/MathExtractApp.tsx
 *
 * Main app shell: holds global state (step, layoutPreference, pages, imageDataUrl,
 * problems, error) via useReducer. When step is "detecting", runs the detection
 * API once per page and merges all problems into one list, then transitions to
 * verify. Renders the step indicator and active step (Upload, Verify, Figures,
 * or Generate).
 */

"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import type { AppState, AppAction } from "@/lib/types";
import type { Problem } from "@/lib/types";
import { UploadStep } from "./UploadStep";
import { VerifyStep } from "./VerifyStep";
import { FigureStep } from "./FigureStep";
import { LayoutStep } from "./LayoutStep";
import { GenerateStep } from "./GenerateStep";

const initialState: AppState = {
  step: "upload",
  layoutPreference: "below",
  pages: [],
  imageDataUrl: null,
  problems: [],
  pageBreaks: new Set<string>(),
  error: null,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload, error: null };
    case "SET_FILE":
      return {
        ...state,
        layoutPreference: action.payload.layoutPreference,
        imageDataUrl: action.payload.imageDataUrl,
        pages: action.payload.pages,
      };
    case "SET_PAGES":
      return { ...state, pages: action.payload };
    case "UPDATE_PAGE_STATUS":
      return {
        ...state,
        pages: state.pages.map((p) =>
          p.id === action.payload.id
            ? {
                ...p,
                status: action.payload.status,
                error: action.payload.error,
              }
            : p
        ),
      };
    case "SET_LAYOUT":
      return { ...state, layoutPreference: action.payload };
    case "SET_PROBLEMS":
      return { ...state, problems: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "UPDATE_PROBLEM":
      return {
        ...state,
        problems: state.problems.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "DELETE_PROBLEM":
      return {
        ...state,
        problems: state.problems.filter((p) => p.id !== action.payload),
      };
    case "ADD_PROBLEM":
      return {
        ...state,
        problems: [...state.problems, action.payload],
      };
    case "SET_PAGE_BREAKS":
      return { ...state, pageBreaks: action.payload };
    case "REORDER_PROBLEMS":
      return { ...state, problems: action.payload };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export function MathExtractApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const detectionRunning = useRef(false);

  // Accept pages as argument so this has no dependency on state.pages — prevents double-fire when pages update mid-detection.
  const runDetection = useCallback(async (pages: AppState["pages"]) => {
    console.log("[MathExtract] Starting detection for", pages.length, "page(s)");

    if (pages.length === 0) {
      dispatch({
        type: "SET_ERROR",
        payload: "No images found. Please upload again.",
      });
      dispatch({ type: "SET_STEP", payload: "upload" });
      return;
    }

    const allProblems: Problem[] = [];
    let pageOffset = 0;
    const pageErrors: string[] = [];

    for (const page of pages) {
      dispatch({
        type: "UPDATE_PAGE_STATUS",
        payload: { id: page.id, status: "detecting" },
      });

      try {
        console.log(
          "[MathExtract] Processing page:",
          page.id,
          "| dataUrl starts with:",
          page.dataUrl?.substring(0, 50)
        );

        if (!page.dataUrl || !page.dataUrl.startsWith("data:")) {
          throw new Error(`Page ${page.id} has invalid image data.`);
        }

        const commaIndex = page.dataUrl.indexOf(",");
        if (commaIndex === -1) {
          throw new Error(
            `Page ${page.id} data URL is malformed — no comma found.`
          );
        }

        const header = page.dataUrl.substring(0, commaIndex);
        const base64 = page.dataUrl.substring(commaIndex + 1);
        const mediaTypeMatch = header.match(/data:(.*?);/);
        const mediaType = mediaTypeMatch?.[1] || "image/jpeg";

        console.log(
          "[MathExtract] mediaType:",
          mediaType,
          "| base64 length:",
          base64.length
        );

        if (base64.length < 100) {
          throw new Error(
            `Page ${page.id} base64 data is too short — image may not have loaded correctly.`
          );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await fetch("/api/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log("[MathExtract] API response status:", res.status);

        const data = await res.json();

        console.log(
          "[MathExtract] Raw API response:",
          data.text?.substring(0, 300)
        );

        if (data.error) throw new Error(data.error);

        if (!data.text || data.text.trim().length === 0) {
          throw new Error("Gemini returned an empty response.");
        }

        const clean = data.text
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();

        console.log(
          "[MathExtract] Cleaned response (first 300 chars):",
          clean.substring(0, 300)
        );

        const arrayStart = clean.indexOf("[");
        const arrayEnd = clean.lastIndexOf("]");

        if (arrayStart === -1 || arrayEnd === -1) {
          console.warn(
            "[MathExtract] No JSON array found in response. Full response:",
            clean
          );
          throw new Error(
            "Gemini did not return a valid list of problems. Try a clearer image."
          );
        }

        const jsonString = clean.substring(arrayStart, arrayEnd + 1);

        console.log(
          "[MathExtract] Extracted JSON:",
          jsonString.substring(0, 300)
        );

        let parsed: Array<{
          id: string;
          label: string;
          text: string;
          figures: string[];
        }>;
        try {
          parsed = JSON.parse(jsonString);
        } catch (parseErr) {
          console.error(
            "[MathExtract] JSON parse failed:",
            parseErr,
            "| String was:",
            jsonString
          );
          throw new Error(
            "Could not parse AI response. The image may be unclear or contain no problems."
          );
        }

        console.log(
          "[MathExtract] Parsed",
          parsed.length,
          "problems from page",
          page.id
        );

        if (!Array.isArray(parsed)) {
          throw new Error("Unexpected response format from Gemini.");
        }

        const pageIndex = pages.indexOf(page) + 1;
        const pageProblems = parsed.map((p, i) => ({
          ...p,
          id: `${page.id}_prob_${i + pageOffset}`,
          pageLabel: pages.length > 1 ? `Page ${pageIndex}` : undefined,
          pageId: page.id,
          figureImages: {} as Record<string, string>,
          confirmed: false,
        }));

        allProblems.push(...pageProblems);
        pageOffset += parsed.length;

        dispatch({
          type: "UPDATE_PAGE_STATUS",
          payload: { id: page.id, status: "done" },
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.name === "AbortError"
              ? "Detection timed out. Try a smaller or clearer image."
              : err.message
            : "Unknown error";
        console.error("[MathExtract] Page", page.id, "failed:", message);
        pageErrors.push(message);
        dispatch({
          type: "UPDATE_PAGE_STATUS",
          payload: { id: page.id, status: "error", error: message },
        });
      }
    }

    console.log("[MathExtract] Total problems collected:", allProblems.length);

    if (allProblems.length === 0) {
      const errorDetails = pageErrors.filter(Boolean).join(" | ");

      dispatch({
        type: "SET_ERROR",
        payload: errorDetails
          ? `Detection failed: ${errorDetails}`
          : "No problems detected. Make sure the image is clear and contains math or science questions.",
      });
      dispatch({ type: "SET_STEP", payload: "upload" });
      return;
    }

    dispatch({ type: "SET_PROBLEMS", payload: allProblems });
    dispatch({ type: "SET_STEP", payload: "verify" });
  }, []);


  useEffect(() => {
    if (state.step === "detecting" && !detectionRunning.current) {
      detectionRunning.current = true;
      runDetection(state.pages).finally(() => {
        detectionRunning.current = false;
      });
    }
    if (state.step !== "detecting") {
      detectionRunning.current = false;
    }
  }, [state.step, state.pages, runDetection]);

  return (
    <div className="dot-grid min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-black">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
            </svg>
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-gray-900">
            MathExtract
          </span>
        </div>

        {state.step !== "generating" && state.step !== "done" && (
          <div className="mb-8 flex items-center gap-0">
            {(
              ["upload", "verify", "figures", "layout"] as const
            ).map((s, i) => {
              const labels = {
                upload: "Upload",
                verify: "Verify",
                figures: "Figures",
                layout: "Layout",
              };
              const order = [
                "upload",
                "detecting",
                "verify",
                "figures",
                "layout",
                "generating",
              ];
              const currentIndex = order.indexOf(state.step);
              const thisIndex = order.indexOf(s);
              const isDone = currentIndex > thisIndex;
              const isActive =
                s === state.step ||
                (s === "upload" && state.step === "detecting");

              return (
                <div key={s} className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isDone
                          ? "bg-black text-white"
                          : isActive
                            ? "border-2 border-black bg-white text-black"
                            : "border border-gray-300 bg-white text-gray-400"
                      }`}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span
                      className={`hidden text-xs font-medium sm:inline ${
                        isActive
                          ? "font-semibold text-gray-900"
                          : isDone
                            ? "text-gray-400"
                            : "text-gray-300"
                      }`}
                    >
                      {labels[s]}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className={`mx-2 h-px w-8 ${
                        isDone ? "bg-black" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {state.error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm leading-relaxed text-red-700">
              {state.error}
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_ERROR", payload: null })}
              className="ml-2 shrink-0 text-lg leading-none text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <main>
          {state.step === "upload" && (
            <UploadStep state={state} dispatch={dispatch} />
          )}

          {state.step === "detecting" &&
            (() => {
              const total = state.pages.length;
              const done = state.pages.filter(
                (p) => p.status === "done"
              ).length;
              const errored = state.pages.filter(
                (p) => p.status === "error"
              );
              const progress =
                total > 0 ? ((done + errored.length) / total) * 100 : 0;
              return (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <p className="text-sm font-medium text-gray-700">
                    Analyzing page{" "}
                    {Math.min(done + errored.length + 1, total)} of {total}...
                  </p>
                  <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {done} of {total} pages complete
                  </p>
                  {errored.map((p) => (
                    <div
                      key={p.id}
                      className="w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
                    >
                      Page error: {p.error ?? "Unknown error"}
                    </div>
                  ))}
                </div>
              );
            })()}

          {state.step === "verify" && (
            <VerifyStep state={state} dispatch={dispatch} />
          )}
          {state.step === "figures" && (
            <FigureStep state={state} dispatch={dispatch} />
          )}
          {state.step === "layout" && (
            <LayoutStep state={state} dispatch={dispatch} />
          )}
          {state.step === "generating" && (
            <GenerateStep state={state} dispatch={dispatch} />
          )}
        </main>
      </div>
    </div>
  );
}
