"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Work", href: "/work" },
  { label: "Process", href: "/process" },
  { label: "Pricing", href: "/pricing" },
  { label: "Free audit", href: "/audit" },
  { label: "About", href: "/about" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu on navigation by comparing against the path it was opened
  // at — adjusting during render rather than firing an effect afterwards.
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(234,236,231,0.94)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid #d5d9d2" : "1px solid transparent",
        transition: "all 380ms cubic-bezier(0.16,1,0.3,1)",
        padding: "0 40px",
      }}
    >
      <nav
        aria-label="Main"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
        }}
      >
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "var(--font-display), Georgia, serif",
              fontSize: 20,
              fontWeight: 500,
              color: "#14181a",
              letterSpacing: "-0.015em",
            }}
          >
            GetWebPage
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ gap: 28, alignItems: "center" }} className="hidden sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 14,
                color: pathname === link.href ? "#14181a" : "#5a6360",
                textDecoration: "none",
                transition: "color 200ms",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#14181a")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color =
                  pathname === link.href ? "#14181a" : "#5a6360")
              }
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: "#7d2436",
              padding: "8px 18px",
              borderRadius: 4,
              textDecoration: "none",
              letterSpacing: "0.01em",
              transition: "background 200ms",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = "#93293e")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = "#7d2436")
            }
          >
            See pricing
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            color: "#14181a",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          style={{
            background: "rgba(234,236,231,0.98)",
            backdropFilter: "blur(14px)",
            borderTop: "1px solid #d5d9d2",
            padding: "24px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
          className="sm:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 16,
                color: "#14181a",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/pricing"
            onClick={() => setMenuOpen(false)}
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#7d2436",
              padding: "12px 20px",
              borderRadius: 4,
              textDecoration: "none",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            See pricing
          </Link>
        </div>
      )}
    </header>
  );
}
