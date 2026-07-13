import React, { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, FileText, User } from "lucide-react";
import { api } from "@/libs/api";

export function EvaluationsDashboard() {
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  
  // Marks state for the currently selected submission
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tests/evaluations/pending");
      setPendingEvaluations(res.data);
    } catch (err: any) {
      setError("Failed to load pending evaluations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = (sub: any) => {
    setSelectedSubmission(sub);
    const initialMarks: Record<string, number> = {};
    const initialComments: Record<string, string> = {};
    
    sub.answers.forEach((ans: any) => {
      if (ans.question.type === "CQ") {
        initialMarks[ans.id] = ans.marksAwarded || 0;
        initialComments[ans.id] = ans.evaluatorComment || "";
      }
    });
    
    setMarks(initialMarks);
    setComments(initialComments);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedSubmission) return;
    setSubmitting(true);
    
    const evaluations = Object.keys(marks).map(answerId => ({
      submissionAnswerId: Number(answerId),
      marksAwarded: Number(marks[answerId]),
      evaluatorComment: comments[answerId] || "",
    }));

    try {
      await api.put("/tests/evaluations", {
        testSubmissionId: selectedSubmission.id,
        evaluations,
      });
      setSelectedSubmission(null);
      await fetchPending();
    } catch (err: any) {
      alert("Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading evaluations...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Pending Evaluations</h2>
          <p className="text-slate-500 dark:text-zinc-400 mt-1">Review and grade subjective questions submitted by learners.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* List Panel */}
        <div className="w-full lg:w-1/3 flex flex-col gap-3">
          {pendingEvaluations.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3 opacity-50" />
              <p className="text-slate-500 font-medium">No pending evaluations!</p>
              <p className="text-sm text-slate-400 mt-1">You are all caught up.</p>
            </div>
          ) : (
            pendingEvaluations.map(sub => (
              <div 
                key={sub.id} 
                onClick={() => handleSelectSubmission(sub)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedSubmission?.id === sub.id 
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" 
                    : "bg-white border-slate-200 hover:border-blue-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-500">
                    <User size={18} />
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-900 dark:text-zinc-100">{sub.user.name}</h5>
                    <p className="text-xs text-slate-500">{sub.user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-zinc-400 font-medium truncate max-w-[200px]">{sub.test.title}</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md text-xs font-bold">
                    Pending
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Evaluation Panel */}
        <div className="w-full lg:w-2/3">
          {selectedSubmission ? (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 mb-5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">{selectedSubmission.test.title}</h3>
                  <p className="text-slate-500 mt-1">Submitted by <span className="font-medium">{selectedSubmission.user.name}</span> on {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {selectedSubmission.answers.filter((a: any) => a.question.type === "CQ").map((ans: any, idx: number) => (
                  <div key={ans.id} className="p-5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700">
                    <div className="flex gap-3 mb-4">
                      <span className="shrink-0 h-6 w-6 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                        Q{idx+1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{ans.question.questionText}</p>
                        <p className="text-xs text-slate-500 mt-1">Max marks: {ans.question.marks}</p>
                      </div>
                    </div>
                    
                    <div className="mb-4 pl-9">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Student's Answer</label>
                      <div className="p-4 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-sm whitespace-pre-wrap">
                        {ans.providedAnswer || <span className="text-slate-400 italic">No answer provided.</span>}
                      </div>
                    </div>

                    <div className="pl-9 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Marks</label>
                        <input 
                          type="number" min="0" max={ans.question.marks} step="0.5"
                          value={marks[ans.id]} 
                          onChange={(e) => setMarks({...marks, [ans.id]: Number(e.target.value)})}
                          className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Feedback Comment (Optional)</label>
                        <input 
                          type="text" placeholder="Good effort, but missed..."
                          value={comments[ans.id]} 
                          onChange={(e) => setComments({...comments, [ans.id]: e.target.value})}
                          className="w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitEvaluation}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Submit Grades"}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400">
              <FileText size={48} className="mb-4 opacity-50" />
              <p>Select a submission from the list to grade.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
