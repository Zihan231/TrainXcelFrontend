"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowLeft, Edit2, Save, X, Plus, Trash2, Check, ChevronDown, ChevronUp, Video, UploadCloud, Camera, Clock } from "lucide-react";
import { api } from "@/libs/api";
import { WebcamRecorder } from "./WebcamRecorder";
import toast from "react-hot-toast";

interface TestPlayerProps {
  lessonId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  isAdmin?: boolean;
  hasNextLesson?: boolean;
  onNextLesson?: () => void;
  externalTest?: any;
}

export function TestPlayer({ 
  lessonId, 
  onSuccess, 
  onCancel, 
  isAdmin = false,
  hasNextLesson = false,
  onNextLesson,
  externalTest
}: TestPlayerProps) {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<number, any>>({});
  const [reviewSubmission, setReviewSubmission] = useState<any | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [examStatus, setExamStatus] = useState<'scheduled' | 'active' | 'completed'>('active');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const answersRef = React.useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Admin edit state
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<number | null>(null);
  const [recordingQuestionId, setRecordingQuestionId] = useState<string | null>(null);

  const formatTimeRemaining = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m remaining`;
    if (m > 0) return `${m}m ${s}s remaining`;
    return `${s}s remaining`;
  };

  useEffect(() => {
    if (externalTest) {
      setTests([externalTest]);
      setLoading(false);
      if (!isAdmin) {
        (async () => {
          try {
            const sRes = await api.get(`/tests/${externalTest.id}/my-submission`);
            setSubmissions(prev => ({ ...prev, [externalTest.id]: sRes.data }));
          } catch {}
        })();
      }
    } else {
      fetchTests();
      if (!isAdmin) fetchLeaderboard();
    }
  }, [lessonId, externalTest]);

  // Countdown timer for standalone exams
  useEffect(() => {
    if (!externalTest || isAdmin) return;

    const computeStatus = () => {
      const now = new Date();
      const start = externalTest.startTime ? new Date(externalTest.startTime) : null;
      const end = externalTest.endTime ? new Date(externalTest.endTime) : null;

      if (start && now < start) {
        setExamStatus('scheduled');
        setTimeRemaining(Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000)));
        return;
      }
      if (end && now > end) {
        setExamStatus('completed');
        setTimeRemaining(0);
        return;
      }
      setExamStatus('active');
      if (end) {
        setTimeRemaining(Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000)));
      }
    };

    computeStatus();
    const interval = setInterval(computeStatus, 1000);
    return () => clearInterval(interval);
  }, [externalTest, isAdmin]);

  const hasAutoSubmitted = React.useRef(false);

  // Auto-submit when timer expires for standalone exams
  useEffect(() => {
    if (!externalTest || isAdmin || examStatus !== 'completed') return;
    if (!activeTest || activeTest.id !== externalTest.id) return;
    if (submissions[activeTest.id] || hasAutoSubmitted.current) return;

    hasAutoSubmitted.current = true;
    const timer = setTimeout(() => {
      handleSubmit(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [externalTest, isAdmin, examStatus, activeTest, submissions]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tests/lesson/${lessonId}`);
      setTests(res.data);

      if (!isAdmin) {
        const subs: Record<number, any> = {};
        await Promise.all(res.data.map(async (t: any) => {
          try {
            const sRes = await api.get(`/tests/${t.id}/my-submission`);
            if (sRes.data) subs[t.id] = sRes.data;
          } catch { /* ignore */ }
        }));
        setSubmissions(subs);
      }
    } catch {
      setError("Failed to load tests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/tests/leaderboard/${lessonId}`);
      setLeaderboard(res.data);
    } catch { /* ignore */ }
  };

  // ─── Admin: start editing a question ────────────────────────────────────────
  const startEdit = (q: any) => {
    setEditingQuestionId(q.id);
    setEditDraft({
      questionText: q.questionText,
      options: q.type === "MCQ" ? [...(q.options || [])] : undefined,
      correctAnswers: q.type === "MCQ" ? [...(q.correctAnswers || [])] : undefined,
      marks: q.marks,
    });
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    setEditDraft({});
  };

  const saveEdit = async (questionId: number) => {
    setSavingEdit(true);
    try {
      await api.put(`/tests/questions/${questionId}`, editDraft);
      // Refresh tests to show updated data
      await fetchTests();
      setEditingQuestionId(null);
      setEditDraft({});
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save question.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleCorrectAnswer = (opt: string) => {
    const current: string[] = editDraft.correctAnswers || [];
    if (current.includes(opt)) {
      setEditDraft({ ...editDraft, correctAnswers: current.filter((c: string) => c !== opt) });
    } else {
      setEditDraft({ ...editDraft, correctAnswers: [...current, opt] });
    }
  };

  const updateOption = (idx: number, val: string) => {
    const opts = [...editDraft.options];
    const oldOpt = opts[idx];
    opts[idx] = val;
    // Also update correctAnswers if the old option was selected
    const corrects = (editDraft.correctAnswers || []).map((c: string) => c === oldOpt ? val : c);
    setEditDraft({ ...editDraft, options: opts, correctAnswers: corrects });
  };

  const addOption = () => {
    setEditDraft({ ...editDraft, options: [...(editDraft.options || []), ""] });
  };

  const removeOption = (idx: number) => {
    const opts = [...editDraft.options];
    const removed = opts[idx];
    opts.splice(idx, 1);
    const corrects = (editDraft.correctAnswers || []).filter((c: string) => c !== removed);
    setEditDraft({ ...editDraft, options: opts, correctAnswers: corrects });
  };

  // ─── Learner: test taking ────────────────────────────────────────────────────
  const handleStartTest = (test: any) => {
    setActiveTest(test);
    hasAutoSubmitted.current = false;
    const initialAnswers: Record<string, any> = {};
    test.questions.forEach((q: any) => {
      initialAnswers[q.id] = q.type === "MCQ" ? [] : "";
    });
    setAnswers(initialAnswers);
  };

  const handleToggleMcq = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = prev[questionId] as string[];
      return current.includes(option)
        ? { ...prev, [questionId]: current.filter(o => o !== option) }
        : { ...prev, [questionId]: [...current, option] };
    });
  };

  const handleSubmit = async (isDraft: boolean) => {
    setIsSubmitting(true);
    try {
      const currentAnswers = answersRef.current;
      const formattedAnswers = Object.keys(currentAnswers).map(qId => ({
        questionId: Number(qId),
        providedAnswer: currentAnswers[qId],
      }));
      await api.post("/tests/submit", {
        testId: activeTest.id,
        isDraft,
        answers: formattedAnswers,
      });
      if (!isDraft) {
        setShowSuccessOverlay(true);
        const sRes = await api.get(`/tests/${activeTest.id}/my-submission`);
        setSubmissions(prev => ({ ...prev, [activeTest.id]: sRes.data }));
        if (onSuccess) onSuccess();
      } else {
        toast.success("Draft saved!");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit test.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  if (showSuccessOverlay) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 text-center flex flex-col items-center justify-center gap-5 max-w-md mx-auto shadow-xl animate-fadeIn">
        <div className="h-16 w-16 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center text-green-500 animate-bounce">
          <CheckCircle size={36} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50">Test Submitted Successfully!</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed font-medium">
            Great job! Your answers have been recorded. Your progress has been updated in your profile dashboard.
          </p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={() => {
              setShowSuccessOverlay(false);
              setActiveTest(null);
              if (onCancel) onCancel(); // Back to lesson
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            Review Lesson
          </button>
          {hasNextLesson && onNextLesson && (
            <button
              onClick={() => {
                setShowSuccessOverlay(false);
                setActiveTest(null);
                onNextLesson();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition"
            >
              Next Lesson →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      Loading tests...
    </div>
  );
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  // ─── ADMIN VIEW ──────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="flex flex-col gap-4 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
            {externalTest ? "Standalone Exam" : "Tests for this Lesson"}
            <span className="ml-2 text-xs font-normal text-slate-400">({tests.length} test{tests.length !== 1 ? "s" : ""})</span>
          </h3>
        </div>

        {tests.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400 text-sm">
            No tests have been created for this lesson yet.
          </div>
        ) : (
          tests.map(test => (
            <div key={test.id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
              {/* Test header */}
              <button
                onClick={() => setExpandedTestId(expandedTestId === test.id ? null : test.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition"
              >
                <div className="text-left">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-100">{test.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{test.questions.length} question{test.questions.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                    {test.questions.filter((q: any) => q.type === "MCQ").length} MCQ · {test.questions.filter((q: any) => q.type === "CQ").length} CQ · {test.questions.filter((q: any) => q.type === "Video").length} Video
                  </span>
                  {expandedTestId === test.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded question editor */}
              {expandedTestId === test.id && (
                <div className="border-t border-slate-100 dark:border-zinc-800 px-5 py-4 flex flex-col gap-4">
                  {test.questions.map((q: any, idx: number) => {
                    const isEditing = editingQuestionId === q.id;
                    return (
                      <div key={q.id} className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/40 p-4">
                        {/* Question header row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                              {q.type}
                            </span>
                            <span className="text-xs text-slate-400">Q{idx + 1}</span>
                          </div>
                          {!isEditing ? (
                            <button
                              onClick={() => startEdit(q)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={cancelEdit}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 px-2.5 py-1 rounded-lg transition"
                              >
                                <X size={11} /> Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(q.id)}
                                disabled={savingEdit}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                              >
                                {savingEdit ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save size={11} />}
                                Save
                              </button>
                            </div>
                          )}
                        </div>

                        {/* View / Edit question text */}
                        {!isEditing ? (
                          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100 mb-2">{q.questionText}</p>
                        ) : (
                          <textarea
                            value={editDraft.questionText || ""}
                            onChange={e => setEditDraft({ ...editDraft, questionText: e.target.value })}
                            rows={2}
                            className="w-full text-sm rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 mb-3 focus:border-blue-500 outline-none resize-none"
                            placeholder="Question text..."
                          />
                        )}

                        <p className="text-[11px] text-slate-400 mb-3">
                          Marks: {!isEditing ? q.marks : (
                            <input
                              type="number"
                              value={editDraft.marks ?? q.marks}
                              onChange={e => setEditDraft({ ...editDraft, marks: Number(e.target.value) })}
                              className="inline-block w-14 ml-1 border border-slate-300 dark:border-zinc-600 rounded px-1 text-xs bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
                              min={1}
                            />
                          )}
                        </p>

                        {/* MCQ options */}
                        {q.type === "MCQ" && (
                          <div className="flex flex-col gap-2">
                            {(!isEditing ? q.options : editDraft.options || []).map((opt: string, oIdx: number) => {
                              const isCorrect = isEditing
                                ? (editDraft.correctAnswers || []).includes(opt)
                                : (q.correctAnswers || []).includes(opt);
                              return (
                                <div key={oIdx} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                                  isCorrect
                                    ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700"
                                    : "border-slate-200 bg-white dark:bg-zinc-900 dark:border-zinc-700"
                                }`}>
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => toggleCorrectAnswer(opt)}
                                        title="Toggle as correct answer"
                                        className={`h-5 w-5 rounded flex items-center justify-center border shrink-0 transition ${
                                          isCorrect ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-zinc-600 text-transparent"
                                        }`}
                                      >
                                        <Check size={12} />
                                      </button>
                                      <input
                                        value={opt}
                                        onChange={e => updateOption(oIdx, e.target.value)}
                                        className="flex-1 text-sm bg-transparent outline-none text-slate-800 dark:text-zinc-200"
                                        placeholder={`Option ${oIdx + 1}`}
                                      />
                                      <button
                                        onClick={() => removeOption(oIdx)}
                                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 transition shrink-0"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <div className={`h-5 w-5 rounded flex items-center justify-center border shrink-0 ${
                                        isCorrect ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-zinc-600"
                                      }`}>
                                        {isCorrect && <Check size={12} />}
                                      </div>
                                      <span className="text-slate-700 dark:text-zinc-300">{opt}</span>
                                      {isCorrect && (
                                        <span className="ml-auto text-[10px] font-bold text-green-600 dark:text-green-400">Correct</span>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {isEditing && (
                              <button
                                onClick={addOption}
                                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-1"
                              >
                                <Plus size={12} /> Add Option
                              </button>
                            )}
                          </div>
                        )}

                        {/* CQ question text only — no answer box for admin */}
                        {q.type === "CQ" && !isEditing && (
                          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-400 italic">
                            Open-ended response question — learners type their answer.
                          </div>
                        )}

                        {/* Video question text only — no answer box for admin */}
                        {q.type === "Video" && !isEditing && (
                          <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs text-slate-400 italic flex items-center gap-2">
                            <Video size={14} className="text-red-500" />
                            Video response question — learners will upload a video.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // ─── LEARNER: taking a test ──────────────────────────────────────────────────
  if (activeTest) {
    const hasTaken = !!submissions[activeTest.id];
    const isStandaloneActive = externalTest && externalTest.id === activeTest.id && examStatus === 'active';
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 animate-fadeIn">
        <button onClick={() => setActiveTest(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition">
          <ArrowLeft size={16} /> Back to tests
        </button>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50">
            {activeTest.title}
          </h3>
          {isStandaloneActive && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg dark:bg-red-950/20 dark:text-red-400">
              <Clock size={14} /> {formatTimeRemaining(timeRemaining)}
            </span>
          )}
        </div>
        {activeTest.description && <p className="text-slate-600 mb-4">{activeTest.description}</p>}
        {hasTaken && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900 rounded-xl text-xs text-green-800 dark:text-green-300">
            <span className="font-bold block mb-1">Test Completed</span>
            You have already submitted this test. See your results and evaluations below.
          </div>
        )}
        
        {!hasTaken && (
          <>
            <div className="flex flex-col gap-6">
              {activeTest.questions.map((q: any, idx: number) => (
                <div key={q.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 dark:bg-zinc-800/40 dark:border-zinc-700 relative">
              <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs shadow-sm dark:bg-blue-900/40 dark:text-blue-300">
                {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
              </div>
              <h5 className="font-semibold text-slate-800 dark:text-zinc-100 mb-6 pr-20">{idx + 1}. {q.questionText}</h5>
              {q.type === "MCQ" && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt: string, oIdx: number) => (
                    <label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white dark:bg-zinc-900 dark:border-zinc-700 cursor-pointer hover:border-blue-400">
                      <input type="checkbox" checked={(answers[q.id] || []).includes(opt)} onChange={() => handleToggleMcq(q.id, opt)} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm text-slate-700 dark:text-zinc-300">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === "CQ" && (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Type your answer here..."
                  className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-500 outline-none dark:bg-zinc-900 dark:border-zinc-700"
                />
              )}
              {q.type === "Video" && (
                <div className="mt-2 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-center gap-4 hover:border-red-400 transition bg-slate-50 dark:bg-zinc-800/30">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Provide Video Response</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">Record a new video or upload an existing file (MP4, WebM, MOV).</p>
                    {answers[q.id] && (
                      <span className="inline-flex mt-3 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 dark:bg-green-900/20 dark:border-green-900/30 items-center gap-1.5">
                        <Check size={12} /> {answers[q.id].split('/').pop()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button type="button" onClick={() => setRecordingQuestionId(q.id)} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                      <Camera size={16} /> Record Video
                    </button>
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="file" 
                        accept="video/*" 
                        capture="environment"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const file = e.target.files[0];
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              setAnswers({ ...answers, [q.id]: "Uploading..." });
                              const res = await api.post('/tests/upload-test-video', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              });
                              if (res.data?.url) {
                                setAnswers({ ...answers, [q.id]: res.data.url });
                              }
                            } catch (err) {
                              alert("Video upload failed. Please try again.");
                              setAnswers({ ...answers, [q.id]: "" });
                            }
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                        id={`video-upload-${q.id}`} 
                      />
                      <label htmlFor={`video-upload-${q.id}`} className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded-lg text-sm font-semibold transition cursor-pointer">
                        <UploadCloud size={16} /> Upload File
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => handleSubmit(true)} disabled={isSubmitting} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition">Save Draft</button>
              <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition">
                {isSubmitting ? "Submitting..." : "Submit Test"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (reviewSubmission) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 animate-fadeIn">
        <button onClick={() => setReviewSubmission(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition">
          <ArrowLeft size={16} /> Back to tests
        </button>
        <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50 mb-1">Reviewing Answers</h3>
        <p className="text-sm text-slate-500 mb-6">Score obtained: <span className="font-bold text-blue-600">{reviewSubmission.marksObtained}</span> points</p>
        <div className="flex flex-col gap-6">
          {(reviewSubmission.answers || []).map((ans: any, idx: number) => {
            const isCQ = ans.question.type === "CQ";
            const provided = Array.isArray(ans.providedAnswer) ? ans.providedAnswer : [ans.providedAnswer];
            const correct = ans.question.correctAnswers || [];
            const isCorrect = !isCQ && provided.length === correct.length && provided.every((v: string) => correct.includes(v));
            return (
              <div key={ans.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50 dark:bg-zinc-800/40 dark:border-zinc-700">
                <h5 className="font-semibold text-slate-800 dark:text-zinc-100 mb-1">{idx + 1}. {ans.question.questionText}</h5>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span>Max Marks: {ans.question.marks}</span>
                  <span className={`font-bold ${isCorrect || (isCQ && ans.marksAwarded > 0) ? "text-green-600" : (isCQ && reviewSubmission.status === "Pending Evaluation" ? "text-amber-500" : "text-rose-600")}`}>
                    Marks Awarded: {isCQ && reviewSubmission.status === "Pending Evaluation" ? "Pending" : (ans.marksAwarded ?? 0)}
                  </span>
                </div>
                {!isCQ ? (
                  <div className="flex flex-col gap-2">
                    {ans.question.options.map((opt: string, oIdx: number) => {
                      const wasSelected = provided.includes(opt);
                      const isOptCorrect = correct.includes(opt);
                      let cls = "border-slate-200 bg-white dark:bg-zinc-900";
                      if (wasSelected && isOptCorrect) cls = "border-green-500 bg-green-50 dark:bg-green-950/20";
                      else if (wasSelected && !isOptCorrect) cls = "border-rose-500 bg-rose-50 dark:bg-rose-950/20";
                      else if (!wasSelected && isOptCorrect) cls = "border-green-500";
                      return (
                        <div key={oIdx} className={`p-3 rounded-lg border ${cls} text-sm flex justify-between items-center`}>
                          <span className="text-slate-700 dark:text-zinc-300">{opt}</span>
                          <div className="flex gap-1.5 text-[10px] font-bold">
                            {wasSelected && <span className="text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">Your Answer</span>}
                            {isOptCorrect && <span className="text-green-600 bg-green-100 dark:bg-green-950/40 px-1.5 py-0.5 rounded">Correct</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white dark:bg-zinc-900 text-sm">
                      <p className="text-slate-500 text-xs font-bold mb-1">Your Answer:</p>
                      <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{ans.providedAnswer || "No answer provided."}</p>
                    </div>
                    {ans.evaluatorComment && (
                      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 text-sm">
                        <p className="text-blue-600 text-xs font-bold mb-1">Evaluator Comment:</p>
                        <p className="text-blue-800 dark:text-blue-300">{ans.evaluatorComment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── LEARNER: test list ───────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 animate-fadeIn">
        <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50 mb-6">Tests &amp; Exams</h3>
        {tests.length === 0 ? (
          <p className="text-slate-500">No tests available for this lesson.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {tests.map(test => {
              const hasTaken = !!submissions[test.id];
              const isStandalone = !!externalTest && externalTest.id === test.id;
              return (
                <div key={test.id} className="p-4 rounded-xl border border-slate-200 flex flex-col gap-3 bg-slate-50 dark:bg-zinc-800/40 dark:border-zinc-700">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-800 dark:text-zinc-100 break-words">{test.title}</h4>
                      <p className="text-xs text-slate-500">{test.questions.length} questions</p>
                    </div>
                    {hasTaken && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0 ${
                        submissions[test.id].status === "Pending Evaluation" 
                          ? "text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400"
                          : "text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400"
                      }`}>
                        {submissions[test.id].status === "Pending Evaluation" ? "Pending Evaluation" : "Submitted"}
                      </span>
                    )}
                    {isStandalone && !hasTaken && examStatus === 'scheduled' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
                        Scheduled
                      </span>
                    )}
                    {isStandalone && !hasTaken && examStatus === 'completed' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400">
                        Ended
                      </span>
                    )}
                  </div>
                  {isStandalone && !hasTaken && examStatus === 'scheduled' && (
                    <p className="text-xs text-slate-500">Starts in {formatTimeRemaining(timeRemaining)}</p>
                  )}
                  {isStandalone && !hasTaken && examStatus === 'active' && (
                    <p className="text-xs text-blue-600 font-semibold">Time remaining: {formatTimeRemaining(timeRemaining)}</p>
                  )}
                  {hasTaken && submissions[test.id].status === "Evaluated" && (() => {
                    const sub = submissions[test.id];
                    const totalMarks = test.questions.reduce((sum: number, q: any) => sum + q.marks, 0);
                    const feedback = sub.answers.filter((a: any) => (a.question.type === "CQ" || a.question.type === "Video") && a.evaluatorComment);
                    return (
                      <div className="text-xs text-slate-600 dark:text-zinc-400">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          Score: {sub.marksObtained} / {totalMarks}
                        </span>
                        {feedback.length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                            <p className="font-semibold text-blue-700 dark:text-blue-400 text-[10px] uppercase tracking-wider">Feedback</p>
                            {feedback.map((a: any, i: number) => (
                              <p key={a.id} className="text-xs text-slate-700 dark:text-zinc-300 mt-1">
                                Q{i + 1}: {a.evaluatorComment}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex gap-2">
                    {(!hasTaken || !test.questions.some((q: any) => q.type === "CQ" || q.type === "Video") || submissions[test.id]?.status !== "Pending Evaluation") && !(isStandalone && examStatus !== 'active') && (
                      <button 
                        onClick={() => handleStartTest(test)} 
                        disabled={isStandalone && examStatus === 'scheduled'}
                        className="flex-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {hasTaken ? "Retake Test" : "Take Test"}
                      </button>
                    )}
                    {hasTaken && submissions[test.id].status !== "Pending Evaluation" && (
                      <button onClick={() => setReviewSubmission(submissions[test.id])} className="flex-1 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        Review Answers
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 animate-fadeIn">
        <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
          <CheckCircle className="text-amber-500" size={18} /> Top 5 Leaderboard
        </h3>
        {leaderboard.length === 0 ? (
          <p className="text-slate-500">No participants yet. Submit your test to be the first!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.map((lb, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? "bg-amber-100 text-amber-700 animate-pulse" :
                    idx === 1 ? "bg-slate-200 text-slate-700" :
                    idx === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                  }`}>#{idx + 1}</span>
                  <span className="font-medium text-slate-800 dark:text-zinc-200">{lb.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-zinc-100">{lb.marksObtained} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Webcam Recorder Modal */}
      {recordingQuestionId && (
        <WebcamRecorder 
          onCancel={() => setRecordingQuestionId(null)}
          onUpload={async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            try {
              setAnswers({ ...answers, [recordingQuestionId]: "Uploading..." });
              setRecordingQuestionId(null);
              const res = await api.post('/tests/upload-test-video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              if (res.data?.url) {
                setAnswers(prev => ({ ...prev, [recordingQuestionId]: res.data.url }));
              }
            } catch (err) {
              alert("Video upload failed. Please try again.");
              setAnswers(prev => ({ ...prev, [recordingQuestionId]: "" }));
            }
          }}
        />
      )}
    </div>
  );
}
