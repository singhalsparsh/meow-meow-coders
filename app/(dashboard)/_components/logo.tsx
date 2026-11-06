import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Show the wordmark next to the mark. Defaults to true. */
  withWordmark?: boolean;
  className?: string;
}

export const Logo = ({ withWordmark = true, className }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        height={36}
        width={36}
        alt="Course Crafter logo"
        src="/logo.png"
        className="rounded-lg object-cover shadow-sm"
        priority={true}
      />
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Course Crafter
        </span>
      )}
    </div>
  );
};
