import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export function IconAction({
  label,
  children,
  href,
  onClick,
  className,
}: {
  label: string;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const controlClass = cn("size-8 text-muted-foreground hover:text-foreground", className);
  const control = href ? (
    <Button asChild variant="ghost" size="icon" className={controlClass} aria-label={label}>
      <Link href={href}>{children}</Link>
    </Button>
  ) : (
    <Button type="button" variant="ghost" size="icon" className={controlClass} aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );

  return (
    <span className="group/tip relative inline-flex">
      {control}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
