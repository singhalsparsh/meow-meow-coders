import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Course Crafter",
  description: "How Course Crafter collects, uses, and protects your personal information.",
};

const sections = [
  {
    title: "1. Information We Collect",
    body: `We collect information you provide directly, such as your name, email
      address, and authentication details when you create an account or contact
      us. We also collect data generated through your use of the platform,
      including progress, submissions, and the content you view or create.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `We use your information to provide and improve the service, track your
      learning progress, manage course content, process any purchases, secure
      your account, and communicate with you about the platform. We do not sell
      your personal information.`,
  },
  {
    title: "3. Cookies and Local Storage",
    body: `We use cookies and browser local storage to remember your preferences,
      keep you signed in, and power features such as coding drafts. You may
      control cookies through your browser settings and through the cookie
      banner shown on our site.`,
  },
  {
    title: "4. How We Share Information",
    body: `We do not sell your personal data. We share information only with
      service providers who help us operate the platform (such as hosting,
      authentication, and payment processing), and only to the extent necessary,
      and where required by law.`,
  },
  {
    title: "5. Data Retention and Security",
    body: `We retain your information for as long as your account is active or as
      needed to provide the service. We apply reasonable technical and
      organizational measures to protect your data, though no method of
      transmission over the internet is completely secure.`,
  },
  {
    title: "6. Your Rights",
    body: `You may access, correct, or delete your personal information and
      request that we stop processing it. You can also close your account at any
      time. To exercise these rights, contact us using the details below.`,
  },
  {
    title: "7. Children",
    body: `The service is not directed to children under 13. We do not knowingly
      collect personal information from children under 13. If you believe a child
      has provided us with personal information, please contact us.`,
  },
  {
    title: "8. Changes to This Policy",
    body: `We may update this policy from time to time. We will post any changes on
      this page and update the effective date below. Your continued use of the
      service after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: "9. Contact Us",
    body: `If you have questions about this privacy policy, you can contact us by
      email at privacy@coursecrafter.example.`,
  },
];

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            This Privacy Policy explains how Course Crafter ("we", "us") collects,
            uses, and protects your personal information when you use our platform.
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
              href="/terms-and-conditions"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/privacy-policy"
              className="text-primary"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
