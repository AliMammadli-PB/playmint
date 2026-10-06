export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#0f2a20" />
        <path d="M11 9.5v13l11-6.5z" fill="#3dffb0" />
      </svg>
      <span className="font-display text-lg font-extrabold tracking-tight">
        play<span className="text-mint">mint</span>
      </span>
    </span>
  );
}
