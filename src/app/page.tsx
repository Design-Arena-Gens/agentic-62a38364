"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  removeBackground,
  type Config as RemoveBgConfig,
} from "@imgly/background-removal";

type ImagePreview = {
  url: string;
  width: number;
  height: number;
};

type ProcessorState = {
  original: ImagePreview | null;
  processed: ImagePreview | null;
  processedBlob: Blob | null;
  filename: string | null;
};

const createEmptyState = (): ProcessorState => ({
  original: null,
  processed: null,
  processedBlob: null,
  filename: null,
});

export default function Home() {
  const [state, setState] = useState<ProcessorState>(() => createEmptyState());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const cleanupUrl = useCallback((url?: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupUrl(state.original?.url);
      cleanupUrl(state.processed?.url);
    };
  }, [cleanupUrl, state.original?.url, state.processed?.url]);

  const handleSelectFile = useCallback(
    async (file: File) => {
      const filename =
        file.name?.trim() || `image-${new Date().toISOString()}`;
      const baseName = filename.replace(/\.[^/.]+$/, "");
      cleanupUrl(state.original?.url);
      cleanupUrl(state.processed?.url);
      setState({ ...createEmptyState(), filename: baseName });
      setError(null);
      setIsProcessing(true);

      try {
        const originalPreview = await createPreview(file);

        const config: RemoveBgConfig = {
          output: {
            format: "image/png",
            quality: 1,
          },
          device: "cpu",
          rescale: false,
        };

        const backgroundlessBlob = await removeBackground(file, config);
        const ensuredBlob = await ensureDimensions(
          backgroundlessBlob,
          originalPreview.width,
          originalPreview.height,
        );
        const processedPreview = await createPreview(ensuredBlob);

        setState({
          original: originalPreview,
          processed: processedPreview,
          processedBlob: ensuredBlob,
          filename: baseName,
        });
      } catch (err) {
        console.error(err);
        setError("تعذّر معالجة الصورة. يرجى المحاولة بصورة أخرى.");
      } finally {
        setIsProcessing(false);
      }
    },
    [cleanupUrl, state.original?.url, state.processed?.url],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      const [file] = files;
      if (!file.type.startsWith("image/")) {
        setError("الرجاء اختيار ملف صورة.");
        return;
      }
      void handleSelectFile(file);
    },
    [handleSelectFile],
  );

  const reset = useCallback(() => {
    cleanupUrl(state.original?.url);
    cleanupUrl(state.processed?.url);
    setState(createEmptyState());
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [cleanupUrl, state.original?.url, state.processed?.url]);

  const downloadName = useMemo(() => {
    if (!state.processedBlob) {
      return "backgroundless.png";
    }
    return `${state.filename ?? "backgroundless"}-transparent.png`;
  }, [state.filename, state.processedBlob]);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      event.currentTarget.classList.remove("border-indigo-400");
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragEnter = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add("border-indigo-400");
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove("border-indigo-400");
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="text-center lg:text-right">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            إزالة الخلفية وجعلها شفافة
          </h1>
          <p className="mt-3 text-slate-300">
            حمّل صورتك وسيتم حفظ الأبعاد الأصلية في ملف PNG شفاف جاهز للتنزيل.
          </p>
        </header>

        <section className="grid gap-12 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <label
              htmlFor="image-upload"
              onDrop={onDrop}
              onDragOver={(event) => event.preventDefault()}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-600 bg-slate-800/50 p-12 text-center transition hover:border-indigo-400 hover:bg-slate-800"
            >
              <div className="rounded-full bg-slate-900/60 p-5 shadow-inner">
                <svg
                  className="h-10 w-10 text-indigo-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 15.5V3.75" />
                  <path d="m8.25 7.5 3.75-3.75 3.75 3.75" />
                  <path d="M6 12.75H5.25A2.25 2.25 0 0 0 3 15v3A2.25 2.25 0 0 0 5.25 20.25h13.5A2.25 2.25 0 0 0 21 18v-3a2.25 2.25 0 0 0-2.25-2.25H18" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">
                  اسحب وأفلت أو انقر لرفع صورة
                </p>
                <p className="text-sm text-slate-400">
                  يدعم JPG, PNG, WEBP حتى 25 ميجابايت
                </p>
              </div>
              <input
                ref={inputRef}
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={(event) => handleFiles(event.target.files)}
                className="hidden"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 text-sm text-slate-400">
              <span className="rounded-full bg-slate-800 px-4 py-2">
                يحافظ على الدقة الأصلية
              </span>
              <span className="rounded-full bg-slate-800 px-4 py-2">
                معالجة محلية بالكامل
              </span>
              <span className="rounded-full bg-slate-800 px-4 py-2">
                مخرجات PNG بخلفية شفافة
              </span>
            </div>
          </div>

          <aside className="space-y-6">
            <PreviewPanel
              title="الصورة الأصلية"
              preview={state.original}
              placeholder="لم يتم تحميل صورة بعد."
            />

            <PreviewPanel
              title="النتيجة"
              preview={state.processed}
              placeholder={
                isProcessing
                  ? "جاري معالجة الصورة..."
                  : "لم يتم إنشاء صورة بعد."
              }
              isProcessing={isProcessing}
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  state.processedBlob &&
                  downloadBlob(state.processedBlob, downloadName)
                }
                disabled={!state.processedBlob || isProcessing}
                className="flex-1 rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                تنزيل النتيجة
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={isProcessing && !state.original}
                className="flex-1 rounded-full border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                إعادة التعيين
              </button>
            </div>
          </aside>
        </section>

        <footer className="rounded-3xl border border-slate-700 bg-slate-900/60 p-6 text-sm leading-6 text-slate-400">
          يعمل التطبيق بالكامل داخل المتصفح للحفاظ على خصوصية صورك. لأول مرة قد
          تستغرق العملية قليلاً بسبب تحميل النموذج، وبعد ذلك تصبح أسرع بكثير.
        </footer>
      </main>
    </div>
  );
}

async function createPreview(
  source: File | Blob,
): Promise<ImagePreview> {
  const url = URL.createObjectURL(source);
  try {
    const dimensions = await readImageDimensions(url);
    return { url, ...dimensions };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function readImageDimensions(src: string): Promise<{
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = reject;
    image.src = src;
  });
}

async function ensureDimensions(
  blob: Blob,
  width: number,
  height: number,
): Promise<Blob> {
  const resultDimensions = await createPreview(blob);
  if (
    resultDimensions.width === width &&
    resultDimensions.height === height
  ) {
    URL.revokeObjectURL(resultDimensions.url);
    return blob;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(resultDimensions.url);
    throw new Error("Canvas context unavailable.");
  }
  context.clearRect(0, 0, width, height);

  await new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, width, height);
      resolve();
    };
    image.onerror = () => resolve();
    image.src = resultDimensions.url;
  });

  URL.revokeObjectURL(resultDimensions.url);

  const resizedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((generatedBlob) => {
      if (!generatedBlob) {
        reject(new Error("Failed to export resized image."));
        return;
      }
      resolve(generatedBlob);
    }, "image/png");
  });

  return resizedBlob;
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type PreviewPanelProps = {
  title: string;
  placeholder: string;
  preview: ImagePreview | null;
  isProcessing?: boolean;
};

function PreviewPanel({
  title,
  placeholder,
  preview,
  isProcessing,
}: PreviewPanelProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
          {title}
        </h2>
        {preview ? (
          <div className="text-xs text-slate-400">
            {preview.width} × {preview.height}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-[260px] items-center justify-center bg-slate-950/50">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt={title}
            className="max-h-[360px] w-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="text-center text-sm text-slate-500">
            {isProcessing ? (
              <span className="flex items-center justify-center gap-3">
                <LoadingSpinner />
                {placeholder}
              </span>
            ) : (
              placeholder
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-indigo-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.75a7.25 7.25 0 1 1-6.18 3.5"
      />
    </svg>
  );
}
