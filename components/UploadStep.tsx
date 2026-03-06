"use client";

import { useState, useCallback, useRef } from "react";
import type { AppState, AppAction, InputType, LayoutPreference } from "@/lib/types";
import type { Dispatch } from "react";

const ACCEPT_PHOTO = "image/jpeg,image/png,image/webp";
const ACCEPT_PDF = "application/pdf";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAcceptedTypes(inputType: InputType | null): string {
  if (inputType === "photo") return ACCEPT_PHOTO;
  if (inputType === "pdf") return ACCEPT_PDF;
  return ACCEPT_PHOTO + "," + ACCEPT_PDF;
}

function validateFile(file: File, inputType: InputType): boolean {
  if (inputType === "photo") {
    return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  }
  return file.type === "application/pdf";
}

type UploadStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

export function UploadStep({ state, dispatch }: UploadStepProps) {
  const [inputType, setInputType] = useState<InputType | null>(null);
  const [layoutPreference, setLayoutPreference] = useState<LayoutPreference>("below");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearFile = useCallback(() => {
    setFile(null);
    setFileError(null);
    setPreviewUrl(null);
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      if (!inputType) {
        setFileError("Choose an input type first.");
        return;
      }
      if (!validateFile(f, inputType)) {
        setFileError(
          inputType === "photo"
            ? "Please upload an image (JPEG, PNG, or WebP)."
            : "Please upload a PDF file."
        );
        return;
      }
      setFileError(null);
      setFile(f);

      if (inputType === "photo") {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setPreviewUrl(dataUrl);
        };
        reader.readAsDataURL(f);
      } else {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
        setPreviewUrl(null);
      }
    },
    [inputType, previewUrl]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDetectProblems = useCallback(() => {
    if (!inputType || !file) return;
    let imageDataUrl: string | null = null;
    if (inputType === "photo" && previewUrl) {
      imageDataUrl = previewUrl;
    }
    dispatch({
      type: "SET_FILE",
      payload: {
        inputType,
        layoutPreference,
        imageDataUrl,
      },
    });
    dispatch({ type: "SET_STEP", payload: "detecting" });
  }, [inputType, layoutPreference, file, previewUrl, dispatch]);

  const canProceed = Boolean(inputType && file);
  const accept = getAcceptedTypes(inputType);

  return (
    <div className="rounded-xl border border-[#1e1e2a] bg-[#111118] p-8">
      <h2 className="text-lg font-semibold text-zinc-100">Step 1: Upload</h2>

      {/* Action 1 — Input type */}
      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-zinc-400">Input type</legend>
        <div className="mt-2 flex gap-4">
          {(
            [
              {
                value: "photo" as const,
                label: "Photo / Scan",
                desc: "A photo or scanned image of a textbook page",
              },
              {
                value: "pdf" as const,
                label: "PDF",
                desc: "An existing PDF file",
              },
            ]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setInputType(opt.value);
                clearFile();
              }}
              className={`flex flex-1 flex-col items-start rounded-lg border-2 p-4 text-left transition ${
                inputType === opt.value
                  ? "border-indigo-500 bg-indigo-500/10 text-zinc-100"
                  : "border-[#1e1e2a] bg-[#111118] text-zinc-300 hover:border-indigo-500/50"
              }`}
            >
              <span className="flex w-full items-center justify-between">
                <span className="font-medium">{opt.label}</span>
                {inputType === opt.value && (
                  <svg
                    className="h-5 w-5 text-indigo-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              <span className="mt-1 text-sm text-zinc-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Action 2 — Layout preference */}
      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-zinc-400">
          Layout preference
        </legend>
        <div className="mt-2 flex gap-4">
          {(
            [
              { value: "below" as const, label: "Figure below problem" },
              { value: "beside" as const, label: "Figure beside problem" },
            ]
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition ${
                layoutPreference === opt.value
                  ? "border-indigo-500/60 bg-indigo-500/10"
                  : "border-[#1e1e2a] bg-[#111118] hover:border-indigo-500/50"
              }`}
            >
              <input
                type="radio"
                name="layout"
                value={opt.value}
                checked={layoutPreference === opt.value}
                onChange={() => setLayoutPreference(opt.value)}
                className="h-4 w-4 border-[#1e1e2a] bg-[#111118] text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-zinc-200">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Action 3 — Upload */}
      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-zinc-400">
          Upload file
        </legend>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
            dragOver
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-[#1e1e2a] bg-[#111118] hover:border-indigo-500/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={onInputChange}
            className="hidden"
            aria-label="Choose file"
          />
          {!file ? (
            <>
              <p className="text-sm text-zinc-400">
                Drag and drop here or click to browse
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {inputType === "photo" && "JPEG, PNG, WebP"}
                {inputType === "pdf" && "PDF"}
                {!inputType && "Choose an input type first"}
              </p>
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              {inputType === "photo" && previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- base64 preview, not a static asset
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-[200px] rounded-lg object-contain"
                />
              ) : inputType === "pdf" ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#1e1e2a]">
                  <svg
                    className="h-8 w-8 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : null}
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          )}
        </div>
        {fileError && (
          <p className="mt-2 text-sm text-red-400">{fileError}</p>
        )}
      </fieldset>

      {/* Proceed */}
      <button
        type="button"
        onClick={handleDetectProblems}
        disabled={!canProceed}
        className="mt-8 w-full rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
      >
        Detect Problems
      </button>
    </div>
  );
}
