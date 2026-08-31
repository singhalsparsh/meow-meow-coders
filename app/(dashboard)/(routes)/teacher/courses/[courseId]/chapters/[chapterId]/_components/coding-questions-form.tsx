"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Code2, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

interface CodingQuestion {
  id: string;
  title: string;
  difficulty: string;
  problemStatement: string;
  testCases: string; // JSON string
  solution: string | null;
  position: number;
}

interface CodingQuestionsFormProps {
  initialData: { codingQuestions: CodingQuestion[] };
  courseId: string;
  chapterId: string;
}

const difficultyColors: Record<string, string> = {
  Easy: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  Medium: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  Hard: "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
};

export const CodingQuestionsForm = ({
  initialData,
  courseId,
  chapterId,
}: CodingQuestionsFormProps) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [questions, setQuestions] = useState(initialData.codingQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New question form state
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [problemStatement, setProblemStatement] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: "", expectedOutput: "" },
  ]);
  const [solution, setSolution] = useState("");

  const toggleAdd = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDifficulty("Medium");
    setProblemStatement("");
    setTestCases([{ input: "", expectedOutput: "" }]);
    setSolution("");
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expectedOutput: "" }]);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const onSubmit = async () => {
    try {
      if (!title.trim() || !problemStatement.trim()) {
        toast.error("Title and problem statement are required");
        return;
      }

      const validTestCases = testCases.filter(
        (tc) => tc.input.trim() || tc.expectedOutput.trim()
      );

      if (validTestCases.length === 0) {
        toast.error("Add at least one test case");
        return;
      }

      const res = await axios.post("/api/coding-questions", {
        chapterId,
        title: title.trim(),
        difficulty,
        problemStatement: problemStatement.trim(),
        testCases: validTestCases,
        solution: solution.trim() || null,
      });

      setQuestions([...questions, res.data]);
      resetForm();
      setIsAdding(false);
      toast.success("Coding question added");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const onDelete = async (questionId: string) => {
    try {
      setDeleting(questionId);
      await axios.delete(`/api/coding-questions/${questionId}`);
      setQuestions(questions.filter((q) => q.id !== questionId));
      toast.success("Question removed");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mt-6 glass-card rounded-2xl p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span>Coding Questions</span>
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
          <Input
            placeholder="Question title (e.g. Two Sum)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex gap-2">
            {["Easy", "Medium", "Hard"].map((d) => (
              <Button
                key={d}
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "transition-all",
                  difficulty === d && difficultyColors[d]
                )}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </Button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Problem Statement
            </label>
            <Textarea
              placeholder="Describe the problem clearly. Include input/output format, constraints, and examples..."
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Test Cases
            </label>
            <div className="space-y-3">
              {testCases.map((tc, index) => (
                <div key={index} className="p-3 rounded-lg bg-white/30 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Test Case {index + 1}
                    </span>
                    {testCases.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        onClick={() => removeTestCase(index)}
                      >
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addTestCase}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Test Case
            </Button>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">
              Solution (optional)
            </label>
            <Textarea
              placeholder="Provide the solution code or explanation..."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={onSubmit} size="sm">
            Add Question
          </Button>
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 ? (
        <div className="mt-4 space-y-2">
          {questions.map((q) => {
            const isExpanded = expandedId === q.id;
            let parsedTestCases: TestCase[] = [];
            try {
              parsedTestCases = JSON.parse(q.testCases);
            } catch {}

            return (
              <div
                key={q.id}
                className="rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3 hover:shadow-sm transition-all">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{q.title}</span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        difficultyColors[q.difficulty] || difficultyColors.Medium
                      )}
                    >
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {parsedTestCases.length} test case{parsedTestCases.length !== 1 ? "s" : ""}
                    </span>
                  </button>
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

                {isExpanded && (
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
                              {tc.explanation && (
                                <div><span className="text-muted-foreground">Explanation:</span> {tc.explanation}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {q.solution && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Solution</h4>
                        <pre className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/50 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                          {q.solution}
                        </pre>
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
          No coding questions added yet. Click &quot;Add Question&quot; to create practice problems for students.
        </p>
      ) : null}
    </div>
  );
};
