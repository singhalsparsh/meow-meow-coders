"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

// Without an error boundary, a throw inside a server component (for example a
// database query failing mid-deploy) blanks the entire route tree with the raw
// Next.js "Something went wrong" page. This boundary keeps the shell usable and
// offers a reload, so a single failing page never takes down course listing.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ROUTE_ERROR]", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/15">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="text-lg font-semibold">
          This page couldn&rsquo;t load
        </h2>
        <p className="text-sm text-muted-foreground">
          Something went wrong while loading this page. Your courses are still
          there &mdash; try reloading.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => reset()} variant="outline" size="sm">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try again
          </Button>
          <Button onClick={() => window.location.reload()} size="sm">
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
