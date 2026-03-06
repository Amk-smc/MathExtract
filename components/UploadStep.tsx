/**
 * components/UploadStep.tsx
 *
 * Step 1: layout preference, multi-page image upload (up to 10 pages, JPG/PNG/WEBP, max 10MB each).
 * Thumbnail grid with remove-per-page and "Add page". Dispatches SET_FILE with pages and
 * imageDataUrl (first page for cropping), then SET_STEP to "detecting".
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AppState,
  AppAction,
  LayoutPreference,
  PageImage,
} from "@/lib/types";
import type { Dispatch } from "react";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PAGES = 10;

const fileToBase64AsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

type UploadStepProps = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

type FileEntry = {
  id: string;
  file: File;
  previewUrl: string;
};

export function UploadStep({ state, dispatch }: UploadStepProps) {
  const [layoutPreference, setLayoutPreference] =
    useState<LayoutPreference>("below");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    const oversized = fileArray.filter((f) => f.size > MAX_SIZE_BYTES);
    if (oversized.length > 0) {
      setFileError(
        `${oversized.length} file(s) are over 10MB and were skipped.`
      );
    }

    const valid = fileArray
      .filter((f) => f.size <= MAX_SIZE_BYTES)
      .filter((f) =>
        ["image/jpeg", "image/png", "image/webp"].includes(f.type)
      );

    setFiles((prev) => {
      const remaining = MAX_PAGES - prev.length;
      const toAdd = valid.slice(0, remaining);
      const newEntries: FileEntry[] = toAdd.map((f) => ({
        id: `page_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
      return [...prev, ...newEntries];
    });
  }, []);

  const removePage = useCallback((id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setFileError(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files;
      if (dropped?.length) handleFiles(dropped);
    },
    [handleFiles]
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
      const selected = e.target.files;
      if (selected?.length) handleFiles(selected);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleDetect = useCallback(async () => {
    if (files.length === 0) return;

    const pages: PageImage[] = await Promise.all(
      files.map(async (f) => {
        const dataUrl = await fileToBase64AsDataUrl(f.file);
        return {
          id: f.id,
          dataUrl,
          filename: f.file.name,
          status: "pending" as const,
        };
      })
    );

    dispatch({
      type: "SET_FILE",
      payload: {
        layoutPreference,
        imageDataUrl: pages[0]?.dataUrl ?? null,
        pages,
      },
    });
    dispatch({ type: "SET_STEP", payload: "detecting" });
  }, [layoutPreference, files, dispatch]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Upload photos of your textbook pages
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
        <legend className="text-sm font-medium text-gray-500">
          Upload pages
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          Accepts JPG, PNG, WEBP — max 10MB per file · up to {MAX_PAGES} pages
        </p>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => files.length < MAX_PAGES && fileInputRef.current?.click()}
          className={`mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
            dragOver
              ? "border-black bg-gray-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_IMAGE}
            onChange={onInputChange}
            className="hidden"
            aria-label="Choose files"
          />
          {files.length === 0 ? (
            <p className="text-sm text-gray-600">
              Drag and drop here or click to browse
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Drop more images or use &quot;Add page&quot; below
            </p>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {files.map((f, i) => (
              <div
                key={f.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.previewUrl}
                  alt={`Page ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  Page {i + 1}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePage(f.id);
                  }}
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-all hover:bg-red-500 group-hover:opacity-100"
                  aria-label={`Remove page ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            {files.length < MAX_PAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-all hover:border-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs">Add page</span>
              </button>
            )}
          </div>
        )}

        {files.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {files.length} page{files.length !== 1 ? "s" : ""} selected · max{" "}
            {MAX_PAGES}
          </p>
        )}

        {fileError && (
          <p className="mt-2 text-sm text-red-600">{fileError}</p>
        )}
      </fieldset>

      <button
        type="button"
        onClick={handleDetect}
        disabled={files.length === 0}
        className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold transition-all ${
          files.length > 0
            ? "bg-black text-white hover:bg-gray-800"
            : "cursor-not-allowed bg-gray-100 text-gray-400"
        }`}
      >
        {files.length > 0
          ? `Detect Problems — ${files.length} page${files.length !== 1 ? "s" : ""}`
          : "Upload at least one page"}
      </button>
    </div>
  );
}
