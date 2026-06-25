export const sourceLinkBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-panel px-3 py-[5px] text-xs font-semibold text-ink transition-colors hover:border-violet/40 hover:text-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-violet/50";

export function SourceLinkButton({
  href,
  title,
}: {
  href: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title ?? "Abrir fuente"}
      className={sourceLinkBtnCls}
    >
      <SourceLinkIcon className="shrink-0" />
    </a>
  );
}

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
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
