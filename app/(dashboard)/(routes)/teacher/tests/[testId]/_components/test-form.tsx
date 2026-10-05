"use client";

import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Globe, Loader2, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TestFormProps {
  initialData: {
    title: string;
    description: string | null;
    isPublished: boolean;
    attempts: number;
  };
}

// Teacher: edit a test's title/description, publish it, copy its share link,
// or delete it.
//
// Publishing is the one action with a server-side guard: the API refuses to
// publish a test with zero questions, so a learner can never be sent to an
// empty assessment. Unpublishing is always allowed and re-hides the test.
export const TestForm = ({ initialData }: TestFormProps) => {
  const router = useRouter();

  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description ?? "");
  const [isPublished, setIsPublished] = useState(initialData.isPublished);
  const [savingTitle, setSavingTitle] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tests/${location.pathname.split("/").pop()}`
      : "";

  const saveTitle = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      setSavingTitle(true);
      await axios.patch(`/api/tests/${location.pathname.split("/").pop()}`, {
        title,
        description,
      });
      toast.success("Test details saved");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingTitle(false);
    }
  };

  const togglePublish = async () => {
    const id = location.pathname.split("/").pop();
    try {
      setToggling(true);
      if (isPublished) {
        await axios.patch(`/api/tests/${id}`, { isPublished: false });
        setIsPublished(false);
        toast.success("Test unpublished");
      } else {
        await axios.patch(`/api/tests/${id}`, { isPublished: true });
        setIsPublished(true);
        toast.success("Test published — it is now takeable");
      }
      router.refresh();
    } catch (error) {
      // The publish guard rejects an empty test with a 400; surface that
      // message instead of a generic failure so the teacher knows what to fix.
      const message =
        axios.isAxiosError(error) && error.response?.status === 400
          ? error.response.data
          : "Something went wrong";
      toast.error(typeof message === "string" ? message : "Something went wrong");
    } finally {
      setToggling(false);
    }
  };

  const onDelete = async () => {
    const id = location.pathname.split("/").pop();
    if (!window.confirm("Delete this test and all its questions and attempts?")) {
      return;
    }
    try {
      setDeleting(true);
      await axios.delete(`/api/tests/${id}`);
      toast.success("Test deleted");
      router.push("/teacher/tests");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — select the link manually");
    }
  };

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <div className="font-medium">Test details</div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={savingTitle}
          placeholder="e.g. DSA fundamentals — screening test"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">
          Description{" "}
          <span className="text-muted-foreground/60">(shown to students)</span>
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={savingTitle}
          placeholder="What does this test cover? How long should it take?"
          rows={3}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={saveTitle}
          disabled={savingTitle || !title.trim()}
          variant="outline"
          size="sm"
        >
          {savingTitle && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
          Save details
        </Button>

        <Button
          type="button"
          onClick={togglePublish}
          disabled={toggling}
          size="sm"
          variant={isPublished ? "outline" : "default"}
          className={cn(!isPublished && "bg-emerald-600 hover:bg-emerald-700")}
        >
          {toggling ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : isPublished ? (
            <X className="h-3.5 w-3.5 mr-1" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1" />
          )}
          {isPublished ? "Unpublish" : "Publish"}
        </Button>

        {isPublished && (
          <Button
            type="button"
            onClick={copyLink}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            Copy share link
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {initialData.attempts > 0 && (
            <span className="text-xs text-muted-foreground">
              {initialData.attempts} attempt
              {initialData.attempts === 1 ? "" : "s"}
            </span>
          )}
          <Button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-600"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {isPublished && shareUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/30 p-2">
          <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="text-xs truncate text-muted-foreground">{shareUrl}</span>
        </div>
      )}
    </div>
  );
};
