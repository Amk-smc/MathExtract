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
import type { PdfPagePreview } from "@/lib/pdfToImages";
import type { Dispatch } from "react";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PAGES = 10;

/** Raw base64 data URL for a file (used as fallback when compression fails). */
function fileToBase64AsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Compresses an image file to max width 1600px and quality 0.85.
 * Reduces base64 size for large photos to avoid timeouts while keeping enough detail for Gemini.
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const MAX_WIDTH = 1600;
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression."));
    };

    img.src = url;
  });
}

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
  const [uploadMode, setUploadMode] = useState<"image" | "pdf">("image");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [pdfPreviews, setPdfPreviews] = useState<PdfPagePreview[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      try {
        const fileArray = Array.from(newFiles);
        console.log(
          "[UploadStep] Files received:",
          fileArray.map((f) => `${f.name} ${f.type} ${f.size}`)
        );

        if (fileArray.length === 0) {
          console.warn("[UploadStep] No files in selection");
          return;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        const invalidType = fileArray.filter(
          (f) => !validTypes.includes(f.type)
        );
        if (invalidType.length > 0) {
          console.warn(
            "[UploadStep] Invalid file types:",
            invalidType.map((f) => f.type)
          );
          setFileError("Unsupported file type. Please use JPG, PNG, or WEBP.");
          return;
        }

        const oversized = fileArray.filter((f) => f.size > MAX_SIZE_BYTES);
        if (oversized.length > 0) {
          setFileError(
            `${oversized.length} file(s) are over 10MB and were skipped.`
          );
        }

        const valid = fileArray.filter(
          (f) =>
            f.size <= MAX_SIZE_BYTES && validTypes.includes(f.type)
        );

        if (valid.length === 0) {
          console.warn("[UploadStep] No valid files after filtering");
          return;
        }

        setFiles((prev) => {
          const remaining = MAX_PAGES - prev.length;
          const toAdd = valid.slice(0, remaining);
          const newEntries: FileEntry[] = toAdd.map((f) => ({
            id: `page_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            file: f,
            previewUrl: URL.createObjectURL(f),
          }));
          console.log(
            "[UploadStep] Adding",
            newEntries.length,
            "file(s) to state"
          );
          return [...prev, ...newEntries];
        });
        setFileError(null);
      } catch (err: unknown) {
        console.error("[UploadStep] handleFiles error:", err);
        setFileError(
          "Failed to load image: " +
            (err instanceof Error ? err.message : "Unknown error")
        );
      }
    },
    []
  );

  const removePage = useCallback((id: string) => {
    setFiles((prev) => {
      const entry = prev.find((f) => f.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setFileError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        void handleFiles(droppedFiles);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files);
      }
      e.target.value = "";
    },
    [handleFiles]
  );

  const handlePdfSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        setFileError("PDF must be under 50MB.");
        return;
      }

      setPdfLoading(true);
      setPdfPreviews([]);
      setSelectedPages(new Set());
      setFileError(null);

      try {
        const { pdfToPageImages } = await import("@/lib/pdfToImages");
        const previews = await pdfToPageImages(file, 20);
        setPdfPreviews(previews);
        setSelectedPages(new Set([1]));
      } catch (err) {
        console.error("[UploadStep] PDF render failed:", err);
        setFileError("Could not render PDF. Try a different file.");
      } finally {
        setPdfLoading(false);
      }
    },
    []
  );

  const togglePageSelection = useCallback((pageNumber: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) {
        next.delete(pageNumber);
      } else {
        next.add(pageNumber);
      }
      return next;
    });
  }, []);

  const handleDetect = useCallback(async () => {
    setFileError(null);

    let pages: PageImage[] = [];

    if (uploadMode === "image") {
      if (files.length === 0) return;
      pages = await Promise.all(
        files.map(async (f) => {
          try {
            const dataUrl = await compressImage(f.file);
            return {
              id: f.id,
              dataUrl,
              filename: f.file.name,
              status: "pending" as const,
            };
          } catch {
            const dataUrl = await fileToBase64AsDataUrl(f.file);
            return {
              id: f.id,
              dataUrl,
              filename: f.file.name,
              status: "pending" as const,
            };
          }
        })
      );
    } else {
      if (selectedPages.size === 0) {
        setFileError("Select at least one page.");
        return;
      }
      const sorted = Array.from(selectedPages).sort((a, b) => a - b);
      pages = sorted.map((pageNum) => {
        const preview = pdfPreviews.find((p) => p.pageNumber === pageNum)!;
        return {
          id: `pdf_page_${pageNum}_${Date.now()}`,
          dataUrl: preview.dataUrl,
          filename: `page_${pageNum}.jpg`,
          status: "pending" as const,
        };
      });
    }

    dispatch({
      type: "SET_FILE",
      payload: {
        layoutPreference,
        imageDataUrl: pages[0]?.dataUrl ?? null,
        pages,
      },
    });
    dispatch({ type: "SET_STEP", payload: "detecting" });
  }, [
    uploadMode,
    files,
    pdfPreviews,
    selectedPages,
    layoutPreference,
    dispatch,
  ]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Upload photos or PDF pages
      </h2>

      <div className="mb-6 mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setUploadMode("image");
            setPdfPreviews([]);
            setFiles([]);
            setFileError(null);
          }}
          className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition ${
            uploadMode === "image"
              ? "border-black bg-black text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Photo / Image
        </button>
        <button
          type="button"
          onClick={() => {
            setUploadMode("pdf");
            setFiles([]);
            setFileError(null);
          }}
          className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition ${
            uploadMode === "pdf"
              ? "border-black bg-black text-white"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          PDF File
        </button>
      </div>

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

      {uploadMode === "pdf" && (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-gray-500">
            Upload PDF
          </legend>
          <p className="mt-1 text-xs text-gray-500">
            Upload a PDF, then select which pages to extract problems from.
          </p>
          <div
            onClick={() => pdfInputRef.current?.click()}
            className="mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-6 transition hover:border-gray-300"
          >
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfSelect}
              aria-label="Choose PDF"
            />
            {pdfLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <p className="text-xs text-gray-500">Rendering PDF pages...</p>
              </div>
            ) : pdfPreviews.length > 0 ? (
              <p className="text-sm text-gray-600">
                {pdfPreviews.length} pages loaded · click to change PDF
              </p>
            ) : (
              <p className="text-sm text-gray-600">Click to upload a PDF</p>
            )}
          </div>
          {pdfPreviews.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium text-gray-500">
                Select pages to extract ({selectedPages.size} selected)
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {pdfPreviews.map((preview) => {
                  const isSelected = selectedPages.has(preview.pageNumber);
                  return (
                    <button
                      key={preview.pageNumber}
                      type="button"
                      onClick={() =>
                        togglePageSelection(preview.pageNumber)
                      }
                      className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition ${
                        isSelected
                          ? "border-black"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview.dataUrl}
                        alt={`Page ${preview.pageNumber}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-xs text-white">
                        p.{preview.pageNumber}
                      </div>
                      {isSelected && (
                        <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-white">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(
                      new Set(pdfPreviews.map((p) => p.pageNumber))
                    )
                  }
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Select all
                </button>
                <span className="text-xs text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedPages(new Set())}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Clear
                </button>
              </div>
            </>
          )}
          {fileError && (
            <p className="mt-2 text-sm text-red-600">{fileError}</p>
          )}
        </fieldset>
      )}

      {uploadMode === "image" && (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-gray-500">
            Upload pages
          </legend>
          <p className="mt-1 text-xs text-gray-500">
            Accepts JPG, PNG, WEBP — max 10MB per file · up to {MAX_PAGES} pages
          </p>
          <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
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
      )}

      <button
        type="button"
        onClick={handleDetect}
        disabled={
          uploadMode === "image"
            ? files.length === 0
            : selectedPages.size === 0
        }
        className={`mt-8 w-full rounded-lg py-3 text-sm font-semibold transition-all ${
          (uploadMode === "image" ? files.length > 0 : selectedPages.size > 0)
            ? "bg-black text-white hover:bg-gray-800"
            : "cursor-not-allowed bg-gray-100 text-gray-400"
        }`}
      >
        {uploadMode === "image"
          ? files.length > 0
            ? `Detect Problems — ${files.length} page${files.length !== 1 ? "s" : ""}`
            : "Upload at least one image"
          : selectedPages.size > 0
            ? `Detect Problems — ${selectedPages.size} page${selectedPages.size !== 1 ? "s" : ""}`
            : "Select at least one page"}
      </button>
    </div>
  );
}
