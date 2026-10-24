export default function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="rshq-mark-gradient" x1="8" y1="6" x2="34" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34E4C8" />
          <stop offset="1" stopColor="#A05CFF" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="#0A0E17" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.1" />
      <path
        d="M12.5 30V10h8.1c4.5 0 7.4 2.7 7.4 6.4 0 3.3-2 5.6-5.4 6.3l6.4 7.3"
        fill="none"
        stroke="url(#rshq-mark-gradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31.5" cy="9" r="2" fill="#34E4C8" />
    </svg>
  );
}
