import Link from "next/link";
import { CSSProperties } from "react";

interface ButtonLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  style?: CSSProperties;
  className?: string;
  target?: string;
  rel?: string;
}

/**
 * Hover states live in globals.css (.btn / .btn-*), so this stays a server
 * component instead of shipping JS to every page that renders a button.
 */
export default function ButtonLink({
  href,
  children,
  variant = "primary",
  style,
  className,
  target,
  rel,
}: ButtonLinkProps) {
  const classes = ["btn", `btn-${variant}`, className].filter(Boolean).join(" ");

  return (
    <Link href={href} className={classes} style={style} target={target} rel={rel}>
      {children}
    </Link>
  );
}
