interface ActionButtonsProps {
  onLike: () => void;
  onSkip: () => void;
  isSubmitting: boolean;
  likeText?: string;
  skipText?: string;
}

export function ActionButtons({
  onLike,
  onSkip,
  isSubmitting,
  likeText = "Let's connect",
  skipText = "Skip",
}: ActionButtonsProps) {
  return (
    <div className="flex justify-center space-x-4">
      <button
        onClick={onSkip}
        disabled={isSubmitting}
        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-gray-900 bg-white border border-gray-300 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_4px_10px_rgba(2,6,23,0.06)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(2,6,23,0.08)] active:translate-y-0 active:shadow-[0_3px_8px_rgba(2,6,23,0.06)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.6),rgba(255,255,255,0)_42%)]"
      >
        {skipText}
      </button>
      <button
        onClick={onLike}
        disabled={isSubmitting}
        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-lg font-mono text-sm text-white bg-gray-900 border border-gray-900 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out will-change-transform hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(0,0,0,0.30)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(0,0,0,0.22)] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.35),rgba(255,255,255,0)_38%)] after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:opacity-0 group-hover:after:opacity-100 after:transition-opacity after:duration-300 after:bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(255,255,255,0.25),rgba(255,255,255,0))]"
      >
        {isSubmitting ? "saving..." : likeText}
      </button>
    </div>
  );
}
