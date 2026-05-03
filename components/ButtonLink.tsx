"use client";

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

const base: CSSProperties = {
  fontFamily: "var(--font-dm-sans), sans-serif",
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 4,
  padding: "13px 28px",
  textDecoration: "none",
  letterSpacing: "0.01em",
  display: "inline-block",
  cursor: "pointer",
  transition: "background 220ms, border-color 220ms, color 220ms",
};

const variants: Record<string, CSSProperties> = {
  primary: {
    background: "#a04020",
    color: "#fff",
    border: "none",
  },
  outline: {
    background: "transparent",
    color: "#1a1612",
    border: "1px solid #c8c0b6",
  },
  ghost: {
    background: "transparent",
    color: "#1a1612",
    border: "none",
    padding: 0,
    borderBottom: "1px solid #c8c0b6",
  },
};

export default function ButtonLink({
  href,
  children,
  variant = "primary",
  style,
  className,
  target,
  rel,
}: ButtonLinkProps) {
  const combined: CSSProperties = { ...base, ...variants[variant], ...style };

  return (
    <Link
      href={href}
      style={combined}
      className={className}
      target={target}
      rel={rel}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (variant === "primary") el.style.background = "#b84a28";
        if (variant === "outline") el.style.borderColor = "#9a9188";
        if (variant === "ghost") el.style.borderBottomColor = "#a04020";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (variant === "primary") el.style.background = "#a04020";
        if (variant === "outline") el.style.borderColor = "#c8c0b6";
        if (variant === "ghost") el.style.borderBottomColor = "#c8c0b6";
      }}
    >
      {children}
    </Link>
  );
}
