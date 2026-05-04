"use client";

const WA_LINK = "https://wa.me/447729741116";

export default function WhatsAppButton() {
  return (
    <>
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="wa-btn"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 2C8.268 2 2 8.268 2 16c0 2.478.658 4.799 1.806 6.8L2 30l7.374-1.782A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2Z"
            fill="white"
          />
          <path
            d="M16 4.2C9.482 4.2 4.2 9.482 4.2 16c0 2.27.635 4.393 1.737 6.2l.24.4-1.02 3.73 3.83-.996.38.22A11.74 11.74 0 0 0 16 27.8c6.518 0 11.8-5.282 11.8-11.8S22.518 4.2 16 4.2Zm6.88 16.54c-.29.82-1.7 1.56-2.32 1.6-.62.06-1.2.28-4.04-.84-3.38-1.36-5.54-4.8-5.7-5.02-.16-.22-1.32-1.76-1.32-3.36s1.04-2.38 1.42-2.7c.36-.32.78-.4 1.04-.4.26 0 .52 0 .74.01.24.01.56-.09.88.67.32.78 1.08 2.62 1.18 2.82.1.2.16.42.04.68-.12.26-.18.42-.36.64-.18.22-.38.5-.54.66-.18.18-.36.38-.16.74.2.36.9 1.48 1.94 2.4 1.34 1.18 2.46 1.56 2.82 1.72.36.16.58.14.8-.08.22-.22.92-1.06 1.16-1.42.24-.36.5-.3.84-.18.34.12 2.16 1.02 2.52 1.2.36.18.6.28.7.42.08.14.08.82-.22 1.64Z"
            fill="#25D366"
          />
        </svg>
      </a>

      <style>{`
        .wa-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #25D366;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4), 0 2px 6px rgba(0,0,0,0.15);
          transition: transform 200ms ease, box-shadow 200ms ease;
          text-decoration: none;
        }
        .wa-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(37, 211, 102, 0.5), 0 2px 8px rgba(0,0,0,0.18);
        }
        @media (max-width: 640px) {
          .wa-btn {
            width: 48px;
            height: 48px;
            bottom: 16px;
            right: 16px;
          }
          .wa-btn svg {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </>
  );
}
