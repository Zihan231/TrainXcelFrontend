"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/libs/api";
import toast from "react-hot-toast";
import { CheckCircle, Clock, Loader2, AlertTriangle } from "lucide-react";

interface ExamGroupPlayerProps {
  examGroupId: number;
  examGroup: any;
  userId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function ExamGroupPlayer({
  examGroupId,
  examGroup,
  userId,
  onComplete,
  onCancel,
}: ExamGroupPlayerProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const totalQuestions = examGroup?.questions?.length || 0;
  const totalMins = examGroup?.timePerQuestion ?? null;

  useEffect(() => {
    if (!examGroup?.questions) return;
    setQuestions(examGroup.questions);
    const submission = examGroup.submissions?.[0];
    if (submission) {
      setSubmitted(true);
      setResult(submission);
    }
    setLoading(false);
  }, [examGroup]);

  useEffect(() => {
    if (totalMins === null || submitted) return;
    const secs = totalMins * 60;
    setTimeLeft(secs);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [totalMins, submitted]);

  const handleAutoSubmit = useCallback(async () => {
    if (submitted) return;
    const answerArray = Object.entries(answers).map(([questionId, providedAnswer]) => ({
      questionId: Number(questionId),
      providedAnswer,
    }));
    if (answerArray.length === 0) {
      toast.error("No answers selected. Submitting empty exam.");
    }
    try {
      setIsSubmitting(true);
      const res = await api.post(`/exam-groups/${examGroupId}/submit`, { answers: answerArray });
      setResult(res.data);
      setSubmitted(true);
      toast.success("Time is up! Exam auto-submitted.");
      onComplete?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to auto-submit exam.");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, examGroupId, submitted, onComplete]);

  const toggleAnswer = (questionId: number, optionKey: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (current.includes(optionKey)) {
        const next = current.filter((a) => a !== optionKey);
        if (next.length === 0) {
          const { [questionId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [...current, optionKey] };
    });
  };

  const handleSubmit = async () => {
    if (submitted) return;
    const answerArray = Object.entries(answers).map(([questionId, providedAnswer]) => ({
      questionId: Number(questionId),
      providedAnswer,
    }));
    try {
      setIsSubmitting(true);
      const res = await api.post(`/exam-groups/${examGroupId}/submit`, { answers: answerArray });
      setResult(res.data);
      setSubmitted(true);
      toast.success("Exam submitted successfully!");
      onComplete?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500">Loading exam...</p>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fadeIn">
        <CheckCircle className="h-14 w-14 text-green-500" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50">Exam Submitted</h2>
        <p className="text-sm text-slate-500">Your answers have been auto-evaluated.</p>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 flex flex-col items-center gap-2 shadow-sm">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Marks Obtained</span>
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{result.marksObtained ?? 0}</span>
          {totalQuestions > 0 && (
            <span className="text-xs text-slate-400">out of {questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0)} marks</span>
          )}
        </div>
        {onCancel && (
          <button onClick={onCancel} className="mt-2 rounded-xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50">{examGroup.title}</h2>
          <p className="text-xs text-slate-400">{totalQuestions} questions {totalMins ? `• ${totalMins} minutes total` : "• Untimed"}</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${timeLeft < 60 ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 animate-pulse" : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"}`}>
            <Clock size={14} /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {questions.map((q: any, idx: number) => (
          <div key={q.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-slate-400 mt-0.5">{idx + 1}.</span>
              <div className="flex-1">
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-2 leading-relaxed">{q.questionText}</p>
                <span className="text-[10px] text-slate-400 mt-1 inline-block">{q.marks} marks</span>
                <div className="mt-3 flex flex-col gap-2">
                  {(q.options || []).map((opt: string, optIdx: number) => {
                    const optionKey = `option_${optIdx}`;
                    const selected = (answers[q.id] || []).includes(optionKey);
                    return (
                      <button
                        key={optIdx}
                        onClick={() => toggleAnswer(q.id, optionKey)}
                        className={`text-left text-base px-5 py-4 rounded-xl border transition flex items-center gap-3 ${
                          selected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                            : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selected ? "border-blue-500 bg-blue-600" : "border-slate-300 dark:border-zinc-700"}`}>
                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
        {onCancel && (
          <button onClick={onCancel} className="rounded-xl border border-slate-200 dark:border-zinc-800 px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition">
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 text-xs font-bold transition shadow-sm"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isSubmitting ? "Submitting..." : "Submit Exam"}
        </button>
      </div>
    </div>
  );
}
