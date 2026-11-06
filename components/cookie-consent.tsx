"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie_consent_v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (value: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // storage unavailable — just hide for this session
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-4 sm:p-5 animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Cookie className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              We use cookies
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              We use cookies and local storage to keep you signed in and remember
              your preferences. See our{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-primary transition-colors">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms-and-conditions" className="underline underline-offset-2 hover:text-primary transition-colors">
                Terms &amp; Conditions
              </Link>{" "}
              for more.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => decide("accepted")}
              >
                Accept
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => decide("declined")}
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
