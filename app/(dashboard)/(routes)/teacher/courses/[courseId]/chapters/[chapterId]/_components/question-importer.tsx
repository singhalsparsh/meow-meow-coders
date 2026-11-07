"use client";

import axios from "axios";
import { useRef, useState } from "react";
import { Download, FileJson, Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ImportedProblem {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
  description: string;
  constraints: string | null;
  solution: string | null;
  starterCode: string;
  driverCode: string | null;
  timeLimitMs: number;
  testCases: {
    id: string;
    input: string;
    expectedOutput: string;
    explanation: string | null;
    isHidden: boolean;
  }[];
}

interface ImportResult {
  title: string;
  status: "created" | "skipped";
  error?: string;
  problem?: ImportedProblem;
}

interface QuestionImporterProps {
  apiBase: string;
  /** Called with every successfully created problem so the parent can update its list. */
  onImported: (problems: ImportedProblem[]) => void;
  /** Called after the import request completes (created or not) to refetch. */
  onDone?: () => void;
}

export const TEMPLATE_URL = "/coding-problems-import-template.json";

export function QuestionImporter({ apiBase, onImported, onDone }: QuestionImporterProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("The file is not valid JSON.");
      }

      let list: unknown[] = [];
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).problems)) {
        list = (parsed as any).problems;
      } else {
        throw new Error(
          "Unrecognized structure — expected a JSON array or an object with a `problems` array."
        );
      }

      if (!list.length) {
        throw new Error("No problems found in the file.");
      }

      // Light client-side sanity check so we can fail fast with a readable message.
      for (let i = 0; i < list.length; i++) {
        const p = list[i] as any;
        if (!p || typeof p !== "object") {
          throw new Error(`Entry ${i + 1} is not an object.`);
        }
        if (!p.title || typeof p.title !== "string") {
          throw new Error(`Entry ${i + 1} is missing a "title".`);
        }
        if (!Array.isArray(p.testCases) || !p.testCases.length) {
          throw new Error(`"${p.title}" has no test cases.`);
        }
      }

      const { data } = await axios.post<{ results: ImportResult[] }>(
        `${apiBase}/problem/import`,
        { problems: list }
      );

      const created = data.results.filter(
        (r) => r.status === "created" && r.problem
      );
      const skipped = data.results.filter((r) => r.status === "skipped");

      if (created.length > 0) {
        onImported(created.map((r) => r.problem!));
        toast.success(`Imported ${created.length} question${created.length > 1 ? "s" : ""}`);
      }
      if (skipped.length > 0) {
        const msg = skipped
          .map((r) => r.error || `"${r.title}" failed`)
          .slice(0, 3)
          .join("; ");
        toast.error(
          `${skipped.length} skipped: ${msg}${skipped.length > 3 ? "…" : ""}`
        );
        setError(`${skipped.length} question(s) skipped. ${msg}`);
      }
      onDone?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Import failed";
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <Upload className="h-3.5 w-3.5 mr-1" />
        )}
        Import questions
      </Button>
      <a
        href={TEMPLATE_URL}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        title="Download an example file you can edit"
      >
        <Download className="h-3.5 w-3.5" />
        Example file
      </a>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && (
        <p
          className={cn(
            "text-xs text-rose-600 dark:text-rose-400 max-w-xs truncate"
          )}
          title={error}
        >
          {error}
        </p>
      )}
    </div>
  );
}
