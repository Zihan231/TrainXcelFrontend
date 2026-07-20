import React, { useState, useEffect } from "react";
import { PlusCircle, Trash2, CheckCircle, Search } from "lucide-react";
import { api } from "@/libs/api";

interface Question {
  id: string; // temp id for UI
  type: "MCQ" | "CQ" | "Video";
  questionText: string;
  marks: number;
  options: string[]; // for MCQ
  correctAnswers: string[]; // for MCQ
}

interface TestBuilderProps {
  courseId: number;
  lessons: Array<{ id: number; title: string }>;
  initialLessonId?: number;
  onSuccess?: (lessonId?: number) => void;
}

export function TestBuilder({
  courseId,
  lessons,
  initialLessonId,
  onSuccess,
}: TestBuilderProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [testType, setTestType] = useState<"Lesson" | "Course" | "Standalone">(
    "Lesson",
  );
  const [lessonId, setLessonId] = useState<number | "">(initialLessonId || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [referenceScript, setReferenceScript] = useState("");
  const [scriptMode, setScriptMode] = useState<"file" | "text">("file");
  const [uploadingScript, setUploadingScript] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleScriptModeChange = (mode: "file" | "text") => {
    setScriptMode(mode);
    setReferenceScript("");
  };

  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploadingScript(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/courses/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setReferenceScript(res.data.url);
      setSuccess("Reference script uploaded successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload script file.");
    } finally {
      setUploadingScript(false);
    }
  };

  const addQuestion = (type: "MCQ" | "CQ" | "Video") => {
    setQuestions([
      ...questions,
      {
        id: Math.random().toString(36).substring(7),
        type,
        questionText: "",
        marks: 0,
        options: type === "MCQ" ? ["Option 1", "Option 2"] : [],
        correctAnswers: [],
      },
    ]);
  };

  const updateQuestion = (
    id: string,
    field: keyof Question,
    value: Question[keyof Question],
  ) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] }
          : q,
      ),
    );
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, i) => (i === index ? value : opt)),
            }
          : q,
      ),
    );
  };

  const toggleCorrectAnswer = (questionId: string, optionValue: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const isSelected = q.correctAnswers.includes(optionValue);
          const newCorrectAnswers = isSelected
            ? q.correctAnswers.filter((a) => a !== optionValue)
            : [...q.correctAnswers, optionValue];
          return { ...q, correctAnswers: newCorrectAnswers };
        }
        return q;
      }),
    );
  };

  const removeOption = (questionId: string, index: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId) {
          const optionToRemove = q.options[index];
          return {
            ...q,
            options: q.options.filter((_, i) => i !== index),
            correctAnswers: q.correctAnswers.filter(
              (a) => a !== optionToRemove,
            ),
          };
        }
        return q;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim()) return setError("Test title is required.");
    if (testType === "Lesson" && !lessonId)
      return setError("Please select a lesson.");
    if (questions.length === 0)
      return setError("Please add at least one question.");

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim())
        return setError(`Question ${i + 1} must have text.`);
      if (q.marks === 0 || !q.marks)
        return setError(`Marks are required for Question ${i + 1}.`);
      if (q.type === "MCQ") {
        if (q.options.length < 2)
          return setError(`MCQ Question ${i + 1} must have at least 2 options.`);
        if (q.correctAnswers.length === 0)
          return setError(`Select at least one correct answer for MCQ Question ${i + 1}.`);
      }
    }

    // Require reference script if there is a Video question
    const hasVideoQuestion = questions.some((q) => q.type === "Video");
    if (hasVideoQuestion && !referenceScript) {
      return setError("Reference Script file is mandatory when adding a Video question.");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        description,
        testType,
        courseId,
        referenceScript: referenceScript || undefined,
        lessonId: testType === "Lesson" ? Number(lessonId) : undefined,
        startTime:
          testType === "Standalone" && startTime
            ? new Date(startTime).toISOString()
            : undefined,
        endTime:
          testType === "Standalone" && endTime
            ? new Date(endTime).toISOString()
            : undefined,
        questions: questions.map(({ id, ...rest }) => ({
          ...rest,
          type: rest.type,
        })),
      };

      await api.post("/tests", payload);
      setSuccess("Test created successfully!");
      setTitle("");
      setDescription("");
      setReferenceScript("");
      setQuestions([]);
      if (onSuccess)
        onSuccess(testType === "Lesson" ? Number(lessonId) : undefined);
    } catch (err: unknown) {
      const anyErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        anyErr.response?.data?.message ||
          anyErr.message ||
          "Failed to create test",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
      <h4 className="font-bold text-slate-900 dark:text-zinc-50 mb-4">
        Create Test / Exam
      </h4>



      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Test Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End of Chapter Quiz"
              className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Test Type
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="Lesson">
                Lesson Quiz (Optional test for a specific lesson)
              </option>
              <option value="Course">Final Course Exam</option>
              <option value="Standalone">Standalone Timed Exam</option>
            </select>
          </div>
        </div>

        {testType === "Lesson" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Select Lesson *
            </label>
            <select
              required
              value={lessonId}
              onChange={(e) => setLessonId(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white p-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="">-- Choose Lesson --</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {testType === "Standalone" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                End Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-500">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instructions for the learners..."
            className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800 min-h-[80px]"
          />
        </div>

        {questions.some(q => q.type === "Video") && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500">
                Reference Script *
              </label>
              <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handleScriptModeChange("file")}
                  className={`px-2.5 py-1 rounded-md transition ${scriptMode === "file" ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => handleScriptModeChange("text")}
                  className={`px-2.5 py-1 rounded-md transition ${scriptMode === "text" ? "bg-white dark:bg-zinc-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
                >
                  Write Plain Text
                </button>
              </div>
            </div>

            {scriptMode === "file" ? (
              <>
                <input
                  type="file"
                  accept=".pdf,.docx,.ppt,.pptx"
                  onChange={handleScriptUpload}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingScript && <span className="text-xs text-blue-500">Uploading script...</span>}
                {referenceScript && (
                  <span className="text-xs text-green-600 font-medium">
                    Uploaded: {referenceScript.split('/').pop()}
                  </span>
                )}
              </>
            ) : (
              <textarea
                placeholder="Paste or write the literal reference script detailing text here..."
                value={referenceScript}
                onChange={(e) => setReferenceScript(e.target.value)}
                className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm focus:border-blue-600 focus:outline-none dark:border-zinc-800 min-h-[120px]"
              />
            )}
          </div>
        )}

        {/* Questions Section */}
        <div className="mt-4 border-t border-slate-100 dark:border-zinc-800 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="font-semibold text-slate-800 dark:text-zinc-100">
              Questions ({questions.length})
            </h5>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addQuestion("MCQ")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <PlusCircle size={14} /> Add MCQ
              </button>
              <button
                type="button"
                onClick={() => addQuestion("CQ")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400"
              >
                <PlusCircle size={14} /> Add CQ
              </button>
              {!questions.some(q => q.type === "Video") && (
                <button
                  type="button"
                  onClick={() => addQuestion("Video")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                >
                  <PlusCircle size={14} /> Add Video
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:bg-zinc-800/50 dark:border-zinc-700 relative"
              >
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex gap-2 items-center mb-3">
                  <span className="px-2 py-1 bg-slate-200 dark:bg-zinc-700 text-xs font-bold rounded-md text-slate-700 dark:text-zinc-300">
                    Q{qIndex + 1} - {q.type}
                  </span>
                  <div className="flex items-center gap-2 ml-auto mr-8">
                    <label className="text-xs font-semibold text-slate-500">
                      Marks:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={q.marks}
                      onChange={(e) =>
                        updateQuestion(q.id, "marks", Number(e.target.value))
                      }
                      className="w-16 rounded-md border border-slate-200 px-2 py-1 text-sm text-center dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Type your question here..."
                  value={q.questionText}
                  onChange={(e) =>
                    updateQuestion(q.id, "questionText", e.target.value)
                  }
                  className="w-full mb-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                />

                {q.type === "MCQ" && (
                  <div className="pl-4 flex flex-col gap-2">
                    <p className="text-xs text-slate-500 mb-1">
                      Options (Check the box to mark as correct answer. Multiple
                      allowed.)
                    </p>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={q.correctAnswers.includes(opt)}
                          onChange={() => toggleCorrectAnswer(q.id, opt)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) =>
                            updateOption(q.id, oIndex, e.target.value)
                          }
                          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, oIndex)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(q.id)}
                      className="text-xs text-blue-600 font-medium self-start mt-1 hover:underline dark:text-blue-400"
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {q.type === "CQ" && (
                  <div className="pl-4">
                    <p className="text-xs text-slate-500 italic">
                      Students will see a text area to write their answer. This
                      requires manual evaluation.
                    </p>
                  </div>
                )}
                {q.type === "Video" && (
                  <div className="pl-4">
                    <p className="text-xs text-slate-500 italic">
                      Students will be prompted to record or upload a video as
                      their answer. This requires manual evaluation.
                    </p>
                  </div>
                )}
              </div>
            ))}
            {questions.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl dark:border-zinc-700">
                No questions added yet. Click above to add MCQ or CQ questions.
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Test"}
        </button>

        {error && (
          <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950/30 dark:text-green-400">
            {success}
          </div>
        )}
      </form>
    </div>
  );
}
