/**
 * components/UploadStep.tsx
 *
 * Step 1: layout preference (figure beside/below), image upload zone (JPG/PNG/WEBP, max 10MB),
 * and "Detect Problems" button. Dispatches SET_FILE with layoutPreference and imageDataUrl,
 * then SET_STEP to "detecting".
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { AppState, AppAction, LayoutPreference } from "@/lib/types";
import type { Dispatch } from "react";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): boolean {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return false;
  if (file.size > MAX_SIZE_BYTES) return false;
  return true;
}

type UploadStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

export function UploadStep({ state, dispatch }: UploadStepProps) {
  const [layoutPreference, setLayoutPreference] =
    useState<LayoutPreference>("below");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!validateFile(f)) {
      setFileError("Please upload a JPG, PNG, or WEBP image (max 10MB).");
      return;
    }
    setFileError(null);
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

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
    if (!file || !previewUrl) return;
    dispatch({
      type: "SET_FILE",
      payload: { layoutPreference, imageDataUrl: previewUrl },
    });
    dispatch({ type: "SET_STEP", payload: "detecting" });
  }, [layoutPreference, file, previewUrl, dispatch]);

  const canProceed = Boolean(file && previewUrl);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Upload a photo of your textbook page
      </h2>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-gray-500">
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
                  ? "border-black bg-gray-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="layout"
                value={opt.value}
                checked={layoutPreference === opt.value}
                onChange={() => setLayoutPreference(opt.value)}
                className="h-4 w-4 border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm font-medium text-gray-900">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-gray-500">Upload file</legend>
        <p className="mt-1 text-xs text-gray-500">
          Accepts JPG, PNG, WEBP — max 10MB
        </p>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
            dragOver
              ? "border-black bg-gray-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_IMAGE}
            onChange={onInputChange}
            className="hidden"
            aria-label="Choose file"
          />
          {!file ? (
            <>
              <p className="text-sm text-gray-600">
                Drag and drop here or click to browse
              </p>
            </>
          ) : (
            <div className="flex w-full flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl!}
                alt="Preview"
                className="max-h-[200px] rounded-lg object-contain"
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          )}
        </div>
        {fileError && (
          <p className="mt-2 text-sm text-red-600">{fileError}</p>
        )}
      </fieldset>

      <button
        type="button"
        onClick={handleDetectProblems}
        disabled={!canProceed}
        className="mt-8 w-full rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black"
      >
        Detect Problems
      </button>
    </div>
  );
}
