export function PremiumLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-[var(--text-tertiary)]">
      <div className="w-12 h-12 rounded-full border-2 border-[var(--bg-subtle)] border-t-[var(--accent)] animate-spin" />
      <div className="font-medium text-sm tracking-wide animate-pulse">{text}</div>
    </div>
  );
}
