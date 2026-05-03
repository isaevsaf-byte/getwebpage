"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

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

export default function ContactSection() {
  const [sent, setSent] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const fields = [
    { label: "Your name", type: "text", placeholder: "Jane Smith" },
    { label: "Email address", type: "email", placeholder: "jane@yourbusiness.co.uk" },
    { label: "Type of business", type: "text", placeholder: "e.g. beauty salon, café, joinery" },
  ];

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
              textTransform: "uppercase" as const,
              color: "#c87850",
              marginBottom: 16,
            }}
          >
            Get in touch
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
            Tell us about your business.
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
            No commitment. We&apos;ll come back within 24 hours with a clear quote.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          {sent ? (
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 28,
                textAlign: "left",
              }}
            >
              {fields.map(({ label, type, placeholder }) => (
                <div key={label}>
                  <label
                    style={{
                      fontFamily: "var(--font-dm-sans), sans-serif",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      color: "#9a9188",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    required
                    style={inputStyle}
                    onFocus={(e) =>
                      ((e.target as HTMLInputElement).style.borderBottomColor =
                        "#1a1612")
                    }
                    onBlur={(e) =>
                      ((e.target as HTMLInputElement).style.borderBottomColor =
                        "#c8c0b6")
                    }
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase" as const,
                    color: "#9a9188",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Your brief
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us what you need..."
                  style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) =>
                    ((e.target as HTMLTextAreaElement).style.borderBottomColor =
                      "#1a1612")
                  }
                  onBlur={(e) =>
                    ((e.target as HTMLTextAreaElement).style.borderBottomColor =
                      "#c8c0b6")
                  }
                />
              </div>
              <div>
                <button
                  type="submit"
                  style={{
                    background: "#a04020",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "13px 28px",
                    fontFamily: "var(--font-dm-sans), sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                    transition: "background 200ms",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "#b84a28")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "#a04020")
                  }
                >
                  Send brief
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
