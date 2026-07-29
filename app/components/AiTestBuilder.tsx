"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/libs/api";
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";

type GenerationStatus = "idle" | "uploading" | "generating" | "completed" | "failed";

interface Lesson {
  id: number;
  lessonId: string;
  title: string;
}

interface AiTestBuilderProps {
  courseId: number;
  lessons: Lesson[];
  initialLessonId?: number;
  onSuccess?: () => void;
}

export function AiTestBuilder({
  courseId,
  lessons,
  initialLessonId,
  onSuccess,
}: AiTestBuilderProps) {
  const searchParams = useSearchParams();
  const passedLessonId = searchParams.get("lessonId");

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    String(initialLessonId || passedLessonId || ""),
  );
  const [mcqCount, setMcqCount] = useState<number>(5);
  const [cqCount, setCqCount] = useState<number>(2);
  const [includeVideoTest, setIncludeVideoTest] = useState<boolean>(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>("");

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [requestId, setRequestId] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!selectedLessonId && lessons.length > 0) {
      const fallback = String(initialLessonId || passedLessonId || lessons[0].id);
      setSelectedLessonId(fallback);
    }
  }, [lessons, initialLessonId, passedLessonId, selectedLessonId]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (status === "generating" && requestId !== null) {
      console.log('[AiTestBuilder] polling requestId', requestId);
      let lastStatus = status;
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/tests/ai/requests/${requestId}`);
          const data = res.data;
          console.log('[AiTestBuilder] poll response', data);
          if (data.status === "completed") {
            lastStatus = data.status;
            setStatus("completed");
            onSuccessRef.current?.();
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (data.status === "failed") {
            lastStatus = data.status;
            setStatus("failed");
            setError(data.errorMessage || "AI generation failed.");
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (lastStatus !== data.status) {
            lastStatus = data.status;
            setStatus(data.status === "processing" ? "generating" : status);
          }
        } catch (err) {
          console.error("[AiTestBuilder] poll failed", err);
          setError("Failed to check generation status.");
          setStatus("failed");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 2000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, requestId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setError("Only PDF and DOCX files are allowed.");
      setDocumentFile(null);
      return;
    }
    setDocumentFile(file);
    setDocumentUrl("");
    setError("");
  };

  const handleUploadDocument = async () => {
    if (!documentFile) return;
    setStatus("uploading");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      const res = await api.post("/tests/ai/upload-document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocumentUrl(res.data.url);
      setStatus("idle");
    } catch (err: any) {
      setError(err.response?.data?.message || "Document upload failed.");
      setStatus("idle");
    }
  };

  const handleGenerate = async () => {
    console.log('[AiTestBuilder] generate clicked', { selectedLessonId, documentUrl, mcqCount, cqCount, includeVideoTest });
    if (!selectedLessonId || !documentUrl) {
      console.warn('[AiTestBuilder] generate blocked', { selectedLessonId, documentUrl });
      setError("Please select a lesson and upload a document.");
      return;
    }

    setStatus("generating");
    setError("");

    try {
      console.log('[AiTestBuilder] posting /tests/ai/generate');
      const res = await api.post("/tests/ai/generate", {
        lessonId: Number(selectedLessonId),
        sourceDocumentUrl: documentUrl,
        sourceDocumentType: documentFile?.name.split(".").pop()?.toLowerCase() || "pdf",
        mcqCount,
        cqCount,
        includeVideoTest,
      });
      console.log('[AiTestBuilder] generate response', res.data);
      if (res.data.status === 'failed') {
        setStatus('failed');
        setError(res.data.errorMessage || 'AI generation failed.');
        return;
      }
      setRequestId(res.data.id);
    } catch (err: any) {
      console.error('[AiTestBuilder] generate error', err);
      setError(err.response?.data?.message || "Failed to start AI generation.");
      setStatus("failed");
    }
  };

  const resetForm = () => {
    setSelectedLessonId(String(initialLessonId || passedLessonId || ""));
    setMcqCount(5);
    setCqCount(2);
    setIncludeVideoTest(false);
    setDocumentFile(null);
    setDocumentUrl("");
    setRequestId(null);
    setStatus("idle");
    setError("");
  };

  const isBusy = status === "uploading" || status === "generating";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">AI Test Builder</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Upload a PDF or DOCX to auto-generate MCQs, descriptive questions, and an optional video test for course <span className="font-mono text-xs">{courseId}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {status === "completed" && requestId !== null && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 size={16} />
          Test generated successfully.
        </div>
      )}

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">1. Select Lesson</h2>
          <p className="mt-1 text-xs text-slate-400">Choose which lesson this AI test belongs to.</p>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Lesson</label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              disabled={isLoadingLessons || isBusy || !lessons.length}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">{isLoadingLessons ? "Loading..." : "Select lesson"}</option>
              {lessons.map((l) => (
                <option key={l.id} value={String(l.id)}>{l.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">2. Upload Document</h2>
          <p className="mt-1 text-xs text-slate-400">Upload a PDF or DOCX source document. Max one file per generation.</p>

          <div className="mt-4">
            <input
              id="ai-document-upload"
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={isBusy}
              className="hidden"
            />
            <label
              htmlFor="ai-document-upload"
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 transition ${
                documentFile
                  ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                  : "border-slate-300 hover:border-blue-400 dark:border-zinc-700 dark:hover:border-blue-500"
              }`}
            >
              <Upload size={18} className={documentFile ? "text-emerald-600" : "text-slate-400"} />
              <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                {documentFile ? documentFile.name : "Click to upload PDF or DOCX"}
              </span>
            </label>
          </div>

          {documentFile && !documentUrl && (
            <div className="mt-3">
              <button
                onClick={handleUploadDocument}
                disabled={status === "uploading"}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {status === "uploading" && <Loader2 size={16} className="animate-spin" />}
                {status === "uploading" ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          )}

          {documentUrl && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} />
              Document uploaded successfully
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">3. Configure Generation</h2>
          <p className="mt-1 text-xs text-slate-400">Set how many questions to generate and whether to include a video test.</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">MCQ Count</label>
              <input
                type="number"
                min={1}
                max={20}
                value={mcqCount}
                onChange={(e) => setMcqCount(Number(e.target.value))}
                disabled={isBusy}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">CQ Count</label>
              <input
                type="number"
                min={0}
                max={10}
                value={cqCount}
                onChange={(e) => setCqCount(Number(e.target.value))}
                disabled={isBusy}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-zinc-800">
                <input
                  type="checkbox"
                  checked={includeVideoTest}
                  onChange={(e) => setIncludeVideoTest(e.target.checked)}
                  disabled={isBusy}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Include video test</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-[#121212]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-50">4. Generate Test</h2>
            <p className="mt-1 text-xs text-slate-400">
              {status === "generating"
                ? "AI is generating your test. This may take a minute..."
                : !selectedLessonId
                  ? "Select a lesson above to enable generation."
                  : !documentUrl
                    ? "Upload a document above to enable generation."
                    : "Review your selections and start generation."}
            </p>
            {status === "generating" && (
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 size={14} className="animate-spin" />
                Generating test, please do not close this page...
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(status === "uploading" || status === "generating") && (
              <Loader2 size={18} className="animate-spin text-blue-600" />
            )}
            {status === "completed" && <CheckCircle2 size={18} className="text-emerald-600" />}
            <button
              onClick={handleGenerate}
              disabled={isBusy || !documentUrl || !selectedLessonId}
              title={!selectedLessonId ? "Please select a lesson" : !documentUrl ? "Please upload a document first" : ""}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                isBusy || !documentUrl || !selectedLessonId
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {status === "generating" ? "Generating..." : "Generate Test"}
            </button>
            {(status === "completed" || status === "failed") && (
              <button
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Create Another
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
