"use client";

/**
 * Primary & secondary calls-to-action. Both are glass buttons with a restrained
 * magnetic pull (fine pointers only) and a specular sheen.
 *
 * While the section id stays on the same page, the CTA smooth-scrolls and
 * updates the URL hash. Once a real page route exists (e.g. `/work/…`) it can
 * become a plain `Link` without touching its consumers.
 */

import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { useMagnetic, useScrollToSection } from "@/lib/hooks";
import { cn } from "@/lib/cn";

interface ButtonBaseProps {
  variant: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}

type ButtonProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** When set, the button smooth-scrolls to this section id. */
    href?: string;
  };

export function MagneticButton({
  variant,
  className,
  children,
  href,
  ...rest
}: ButtonProps) {
  const ref = useMagnetic<HTMLAnchorElement>();
  const scrollTo = useScrollToSection();

  // Narrowed in one expression so TypeScript can see `href` is defined.
  const targetId = href && href.startsWith("#") ? href.slice(1) : null;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!targetId) return;
    event.preventDefault();
    scrollTo(targetId);
    rest.onClick?.(event);
  };

  return (
    <a
      ref={ref}
      href={href}
      onClick={handleClick}
      className={cn(
        "glass-1 glass-sheen glass-interactive inline-flex h-11 items-center gap-2.5",
        "rounded-control px-6 text-small font-medium tracking-[-0.01em]",
        "transition-[border-color,box-shadow,background-color] duration-[var(--dur-base)]",
        variant === "primary" &&
          "bg-[var(--glass-3-tint-top)] text-white shadow-[var(--shadow-sm)]",
        variant === "secondary" && "text-text",
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
