import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions | Course Crafter",
  description: "The terms and conditions governing your use of the Course Crafter platform.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: `By creating an account or using Course Crafter, you agree to these Terms
      & Conditions. If you do not agree, please do not use the service.`,
  },
  {
    title: "2. Use of the Service",
    body: `You may use the service for lawful, personal, and non-commercial learning
      purposes. You agree not to misuse the platform, attempt to gain
      unauthorized access, reverse engineer the service, or interfere with its
      operation.`,
  },
  {
    title: "3. Accounts",
    body: `You are responsible for maintaining the confidentiality of your account
      credentials and for all activity that occurs under your account. You agree
      to provide accurate information and to notify us of any unauthorized use.`,
  },
  {
    title: "4. Courses and Content",
    body: `Course content is provided for educational purposes. We may modify,
      update, or remove content at any time. Content created and published by
      instructors is their responsibility; we are not liable for the accuracy or
      completeness of user-provided content.`,
  },
  {
    title: "5. Intellectual Property",
    body: `The service, its design, logos, and original content are owned by us or
      our licensors and are protected by intellectual property laws. Unless
      explicitly permitted, you may not copy, reproduce, or redistribute them.`,
  },
  {
    title: "6. Acceptable Use",
    body: `You agree not to upload or transmit any unlawful, harmful, threatening,
      abusive, defamatory, or infringing content, or any content that violates
      the rights of others or our policies.`,
  },
  {
    title: "7. Disclaimers",
    body: `The service is provided "as is" and "as available" without warranties of
      any kind, whether express or implied, including implied warranties of
      merchantability and fitness for a particular purpose. We do not warrant
      that the service will be uninterrupted, error-free, or secure.`,
  },
  {
    title: "8. Limitation of Liability",
    body: `To the maximum extent permitted by law, we will not be liable for any
      indirect, incidental, special, consequential, or punitive damages, or for
      any loss of profits, data, or goodwill arising out of your use of the
      service.`,
  },
  {
    title: "9. Termination",
    body: `We may suspend or terminate your access to the service at any time, with
      or without notice, if you violate these terms or if we believe it is
      necessary to protect the platform or other users.`,
  },
  {
    title: "10. Governing Law",
    body: `These terms are governed by the laws of the jurisdiction in which we
      operate, without regard to conflict-of-law principles.`,
  },
  {
    title: "11. Changes to These Terms",
    body: `We may update these terms from time to time. Changes are effective when
      posted on this page. Your continued use of the service constitutes
      acceptance of the updated terms.`,
  },
  {
    title: "12. Contact Us",
    body: `If you have any questions about these terms, contact us at
      legal@coursecrafter.example.`,
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-page-gradient">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="glass-card rounded-3xl p-6 sm:p-10">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Last updated: November 2025
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            These Terms &amp; Conditions ("Terms") govern your access to and use of
            the Course Crafter platform.
          </p>

          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{s.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/privacy-policy"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-primary"
            >
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
