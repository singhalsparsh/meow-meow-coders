"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface LeetCodeQuestion {
  id: string;
  title: string;
  url: string;
  difficulty: string;
  tags: string | null;
  notes: string | null;
  position: number;
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
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [questions, setQuestions] = useState(initialData.leetcodeQuestions);
  const [form, setForm] = useState({
    title: "",
    url: "",
    difficulty: "Medium",
    tags: "",
    notes: "",
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleEdit = () => setIsEditing(!isEditing);
  const toggleAdd = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      setForm({ title: "", url: "", difficulty: "Medium", tags: "", notes: "" });
    }
  };

  const onSubmit = async () => {
    try {
      if (!form.title.trim() || !form.url.trim()) {
        toast.error("Title and URL are required");
        return;
      }

      const res = await axios.post("/api/leetcode", {
        chapterId,
        title: form.title.trim(),
        url: form.url.trim(),
        difficulty: form.difficulty,
        tags: form.tags.trim() || null,
        notes: form.notes.trim() || null,
      });

      setQuestions([...questions, res.data]);
      setForm({ title: "", url: "", difficulty: "Medium", tags: "", notes: "" });
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

  return (
    <div className="mt-6 border bg-slate-50 dark:bg-slate-900/50 rounded-md p-4 glass-card">
      <div className="font-medium flex items-center justify-between">
        <span>LeetCode Practice Questions</span>
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
        <div className="mt-4 space-y-3 p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <Input
            placeholder="Question title (e.g. Two Sum)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="LeetCode URL (e.g. https://leetcode.com/problems/two-sum/)"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
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
                  form.difficulty === d && difficultyColors[d]
                )}
                onClick={() => setForm({ ...form, difficulty: d })}
              >
                {d}
              </Button>
            ))}
          </div>
          <Input
            placeholder="Tags (comma-separated, e.g. Array, Hash Table)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <Textarea
            placeholder="Notes for students (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
          <Button onClick={onSubmit} size="sm">
            Add Question
          </Button>
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 ? (
        <div className="mt-4 space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:shadow-sm transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline truncate flex items-center gap-1.5 no-animate"
                  >
                    {q.title}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      difficultyColors[q.difficulty] || difficultyColors.Medium
                    )}
                  >
                    {q.difficulty}
                  </span>
                </div>
                {q.tags && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {q.tags}
                  </p>
                )}
                {q.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {q.notes}
                  </p>
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
          ))}
        </div>
      ) : !isAdding ? (
        <p className="text-sm text-muted-foreground mt-4">
          No questions added yet. Click &quot;Add Question&quot; to attach LeetCode problems to this chapter.
        </p>
      ) : null}
    </div>
  );
};
