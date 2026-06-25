export function SourceLinkIcon({ className = "shrink-0 opacity-70" }: { className?: string }) {
  return (
    <svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M10 5H5a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 5 20h12a1.5 1.5 0 0 0 1.5-1.5V14" />
      <path d="M14 4h6v6M20 4l-9 9" />
    </svg>
  );
}
