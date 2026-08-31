"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, ExternalLink, Code2, ChevronDown, ChevronUp, Link, FileText } from "lucide-react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

interface LeetCodeQuestion {
  id: string;
  title: string;
  url: string | null;
  difficulty: string;
  tags: string | null;
  notes: string | null;
  position: number;
  problemStatement: string | null;
  testCases: string | null;
  solution: string | null;
}

interface LeetcodeFormProps {
  initialData: { leetcodeQuestions: LeetCodeQuestion[] };
  courseId: string;
  chapterId: string;
}

const difficultyColors: Record<string, string> = {
  Easy: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  Medium: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  Hard: "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
};

export const LeetcodeForm = ({
  initialData,
  courseId,
  chapterId,
}: LeetcodeFormProps) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [questions, setQuestions] = useState(initialData.leetcodeQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Toggle: "link" or "custom"
  const [questionType, setQuestionType] = useState<"link" | "custom">("link");

  // Link form
  const [linkForm, setLinkForm] = useState({ title: "", url: "", difficulty: "Medium", tags: "", notes: "" });

  // Custom form
  const [customForm, setCustomForm] = useState({
    title: "",
    difficulty: "Medium",
    problemStatement: "",
    testCases: [{ input: "", expectedOutput: "", explanation: "" }] as TestCase[],
    solution: "",
  });

  const toggleAdd = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      setLinkForm({ title: "", url: "", difficulty: "Medium", tags: "", notes: "" });
      setCustomForm({
        title: "", difficulty: "Medium", problemStatement: "",
        testCases: [{ input: "", expectedOutput: "", explanation: "" }],
        solution: "",
      });
      setQuestionType("link");
    }
  };

  const addTestCase = () => {
    setCustomForm({
      ...customForm,
      testCases: [...customForm.testCases, { input: "", expectedOutput: "", explanation: "" }],
    });
  };

  const removeTestCase = (index: number) => {
    if (customForm.testCases.length > 1) {
      setCustomForm({
        ...customForm,
        testCases: customForm.testCases.filter((_, i) => i !== index),
      });
    }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...customForm.testCases];
    updated[index] = { ...updated[index], [field]: value };
    setCustomForm({ ...customForm, testCases: updated });
  };

  const onSubmitLink = async () => {
    try {
      if (!linkForm.title.trim() || !linkForm.url.trim()) {
        toast.error("Title and URL are required");
        return;
      }
      const res = await axios.post("/api/leetcode", {
        chapterId,
        title: linkForm.title.trim(),
        url: linkForm.url.trim(),
        difficulty: linkForm.difficulty,
        tags: linkForm.tags.trim() || null,
        notes: linkForm.notes.trim() || null,
      });
      setQuestions([...questions, res.data]);
      setLinkForm({ title: "", url: "", difficulty: "Medium", tags: "", notes: "" });
      setIsAdding(false);
      toast.success("Question added");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onSubmitCustom = async () => {
    try {
      if (!customForm.title.trim() || !customForm.problemStatement.trim()) {
        toast.error("Title and problem statement are required");
        return;
      }
      const validTestCases = customForm.testCases.filter(
        (tc) => tc.input.trim() || tc.expectedOutput.trim()
      );
      if (validTestCases.length === 0) {
        toast.error("Add at least one test case");
        return;
      }
      const res = await axios.post("/api/leetcode", {
        chapterId,
        title: customForm.title.trim(),
        difficulty: customForm.difficulty,
        problemStatement: customForm.problemStatement.trim(),
        testCases: JSON.stringify(validTestCases),
        solution: customForm.solution.trim() || null,
      });
      setQuestions([...questions, res.data]);
      setCustomForm({
        title: "", difficulty: "Medium", problemStatement: "",
        testCases: [{ input: "", expectedOutput: "", explanation: "" }],
        solution: "",
      });
      setIsAdding(false);
      toast.success("Question added");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onDelete = async (questionId: string) => {
    try {
      setDeleting(questionId);
      await axios.delete(`/api/leetcode/${questionId}`);
      setQuestions(questions.filter((q) => q.id !== questionId));
      toast.success("Question removed");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(null);
    }
  };

  const isCustom = (q: LeetCodeQuestion) => !!q.problemStatement;

  return (
    <div className="mt-6 glass-card rounded-2xl p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span>Questions</span>
        </div>
        <Button onClick={toggleAdd} variant="ghost" size="sm">
          {isAdding ? "Cancel" : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </>
          )}
        </Button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="mt-4 space-y-4 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          {/* Type toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={questionType === "link" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuestionType("link")}
            >
              <Link className="h-3 w-3 mr-1" />
              LeetCode Link
            </Button>
            <Button
              type="button"
              variant={questionType === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuestionType("custom")}
            >
              <FileText className="h-3 w-3 mr-1" />
              Custom Question
            </Button>
          </div>

          {questionType === "link" ? (
            /* ---- Link form ---- */
            <div className="space-y-3">
              <Input
                placeholder="Question title (e.g. Two Sum)"
                value={linkForm.title}
                onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
              />
              <Input
                placeholder="LeetCode URL (e.g. https://leetcode.com/problems/two-sum/)"
                value={linkForm.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
              />
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard"].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("transition-all", linkForm.difficulty === d && difficultyColors[d])}
                    onClick={() => setLinkForm({ ...linkForm, difficulty: d })}
                  >
                    {d}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Tags (comma-separated, e.g. Array, Hash Table)"
                value={linkForm.tags}
                onChange={(e) => setLinkForm({ ...linkForm, tags: e.target.value })}
              />
              <Textarea
                placeholder="Notes for students (optional)"
                value={linkForm.notes}
                onChange={(e) => setLinkForm({ ...linkForm, notes: e.target.value })}
                rows={2}
              />
              <Button onClick={onSubmitLink} size="sm">Add Question</Button>
            </div>
          ) : (
            /* ---- Custom question form ---- */
            <div className="space-y-4">
              <Input
                placeholder="Question title (e.g. Two Sum)"
                value={customForm.title}
                onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })}
              />
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard"].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("transition-all", customForm.difficulty === d && difficultyColors[d])}
                    onClick={() => setCustomForm({ ...customForm, difficulty: d })}
                  >
                    {d}
                  </Button>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Problem Statement</label>
                <Textarea
                  placeholder={"Describe the problem clearly.\n\nExample:\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."}
                  value={customForm.problemStatement}
                  onChange={(e) => setCustomForm({ ...customForm, problemStatement: e.target.value })}
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Test Cases</label>
                <div className="space-y-3">
                  {customForm.testCases.map((tc, index) => (
                    <div key={index} className="p-3 rounded-lg bg-white/30 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Test Case {index + 1}</span>
                        {customForm.testCases.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600" onClick={() => removeTestCase(index)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        placeholder="Input (e.g. nums = [2,7,11,15], target = 9)"
                        value={tc.input}
                        onChange={(e) => updateTestCase(index, "input", e.target.value)}
                        rows={2}
                        className="font-mono text-xs"
                      />
                      <Textarea
                        placeholder="Expected Output (e.g. [0,1])"
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                        rows={1}
                        className="font-mono text-xs"
                      />
                      <Input
                        placeholder="Explanation (optional)"
                        value={tc.explanation || ""}
                        onChange={(e) => updateTestCase(index, "explanation", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addTestCase}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Test Case
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Solution (optional)</label>
                <Textarea
                  placeholder="Provide the solution code or explanation..."
                  value={customForm.solution}
                  onChange={(e) => setCustomForm({ ...customForm, solution: e.target.value })}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={onSubmitCustom} size="sm">Add Question</Button>
            </div>
          )}
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 ? (
        <div className="mt-4 space-y-2">
          {questions.map((q) => {
            const custom = isCustom(q);
            const isExpanded = expandedId === q.id;
            let parsedTestCases: TestCase[] = [];
            if (custom && q.testCases) {
              try { parsedTestCases = JSON.parse(q.testCases); } catch {}
            }

            return (
              <div key={q.id} className="rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 overflow-hidden group">
                <div className="flex items-center gap-3 p-3 hover:shadow-sm transition-all">
                  {custom && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="text-muted-foreground flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {custom ? (
                        <span className="font-medium text-sm truncate">{q.title}</span>
                      ) : (
                        <a href={q.url!} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:underline truncate flex items-center gap-1.5 no-animate">
                          {q.title}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </a>
                      )}
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", difficultyColors[q.difficulty] || difficultyColors.Medium)}>
                        {q.difficulty}
                      </span>
                      {custom ? (
                        <span className="text-xs text-muted-foreground">{parsedTestCases.length} test case{parsedTestCases.length !== 1 ? "s" : ""}</span>
                      ) : q.tags ? (
                        <span className="text-xs text-muted-foreground truncate">{q.tags}</span>
                      ) : null}
                    </div>
                    {!custom && q.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate">{q.notes}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => onDelete(q.id)}
                    disabled={deleting === q.id}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded custom question details */}
                {custom && isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="mt-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Problem</h4>
                      <p className="text-sm whitespace-pre-wrap">{q.problemStatement}</p>
                    </div>
                    {parsedTestCases.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Test Cases</h4>
                        <div className="space-y-2">
                          {parsedTestCases.map((tc, i) => (
                            <div key={i} className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/50 text-xs font-mono space-y-1">
                              <div><span className="text-muted-foreground">Input:</span> {tc.input}</div>
                              <div><span className="text-muted-foreground">Output:</span> {tc.expectedOutput}</div>
                              {tc.explanation && <div><span className="text-muted-foreground">Note:</span> {tc.explanation}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {q.solution && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Solution</h4>
                        <pre className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/50 text-xs font-mono whitespace-pre-wrap overflow-x-auto">{q.solution}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !isAdding ? (
        <p className="text-sm text-muted-foreground mt-4">
          No questions added yet. Click &quot;Add Question&quot; to attach problems to this chapter.
        </p>
      ) : null}
    </div>
  );
};
