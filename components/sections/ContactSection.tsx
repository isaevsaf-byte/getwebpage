"use client";

import { useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid #c8c0b6",
  padding: "10px 0",
  fontFamily: "var(--font-cormorant), Georgia, serif",
  fontSize: "1.05rem",
  fontStyle: "italic",
  color: "#1a1612",
  outline: "none",
  transition: "border-color 200ms",
};

type Status = "idle" | "loading" | "success" | "error";

export default function ContactSection() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      businessType: (form.elements.namedItem("businessType") as HTMLInputElement).value,
      brief: (form.elements.namedItem("brief") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMsg(json.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }, []);

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-dm-sans), sans-serif",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#9a9188",
    display: "block",
    marginBottom: 8,
  };

  return (
    <section
      id="contact"
      ref={ref}
      style={{
        background: "#f7f3ec",
        padding: "120px 40px",
        borderTop: "1px solid #e8e3d8",
      }}
    >
      <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center" }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#c87850",
              marginBottom: 16,
            }}
          >
            Custom projects
          </div>
          <h2
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#1a1612",
              marginBottom: 16,
            }}
          >
            Got a complex project?
          </h2>
          <p
            style={{
              fontFamily: "var(--font-dm-sans), sans-serif",
              fontSize: 14,
              color: "#6b6358",
              lineHeight: 1.72,
              marginBottom: 48,
            }}
          >
            For custom builds, e-commerce, or anything that doesn&apos;t fit a standard
            package — tell us about it and we&apos;ll put together a quote.
          </p>
        </motion.div>

        {/* Form / states */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {status === "success" ? (
            // ── Success state ──────────────────────────────────────────
            <div
              style={{
                background: "#f0f5f2",
                border: "1px solid #b0d0c0",
                borderRadius: 4,
                padding: "28px 32px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontSize: "1.6rem",
                  fontStyle: "italic",
                  color: "#2a5040",
                  marginBottom: 8,
                }}
              >
                We&apos;ve got your brief.
              </div>
              <div
                style={{
                  fontFamily: "var(--font-dm-sans), sans-serif",
                  fontSize: 13,
                  color: "#6b6358",
                }}
              >
                Expect a reply within 24 hours.
              </div>
            </div>
          ) : (
            // ── Form ───────────────────────────────────────────────────
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 28, textAlign: "left" }}
            >
              {/* Name */}
              <div>
                <label style={labelStyle} htmlFor="name">Your name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jane Smith"
                  required
                  style={inputStyle}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = "#1a1612")}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = "#c8c0b6")}
                />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle} htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@yourbusiness.co.uk"
                  required
                  style={inputStyle}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = "#1a1612")}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = "#c8c0b6")}
                />
              </div>

              {/* Business type */}
              <div>
                <label style={labelStyle} htmlFor="businessType">Type of business</label>
                <input
                  id="businessType"
                  name="businessType"
                  type="text"
                  placeholder="e.g. beauty salon, café, joinery"
                  required
                  style={inputStyle}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = "#1a1612")}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderBottomColor = "#c8c0b6")}
                />
              </div>

              {/* Brief */}
              <div>
                <label style={labelStyle} htmlFor="brief">Your brief</label>
                <textarea
                  id="brief"
                  name="brief"
                  rows={4}
                  placeholder="Tell us what you need..."
                  required
                  style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderBottomColor = "#1a1612")}
                  onBlur={(e) => ((e.target as HTMLTextAreaElement).style.borderBottomColor = "#c8c0b6")}
                />
              </div>

              {/* Error message */}
              {status === "error" && (
                <div
                  style={{
                    background: "#fdf0ed",
                    border: "1px solid #e8b8a8",
                    borderRadius: 4,
                    padding: "12px 16px",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 13,
                    color: "#a04020",
                    textAlign: "left",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  style={{
                    background: status === "loading" ? "#c8a090" : "#a04020",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "13px 28px",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                    letterSpacing: "0.01em",
                    transition: "background 200ms",
                    minWidth: 120,
                  }}
                  onMouseEnter={(e) => {
                    if (status !== "loading")
                      (e.currentTarget as HTMLButtonElement).style.background = "#b84a28";
                  }}
                  onMouseLeave={(e) => {
                    if (status !== "loading")
                      (e.currentTarget as HTMLButtonElement).style.background = "#a04020";
                  }}
                >
                  {status === "loading" ? "Sending…" : "Send brief"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
