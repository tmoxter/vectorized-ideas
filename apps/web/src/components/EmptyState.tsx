import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  actionText: string;
  onAction: () => void;
}

export function EmptyState({
  Icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-6">
        <Icon className="w-24 h-24 text-gray-400" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-mono font-bold text-gray-900 mb-2">
        {title}
      </h2>
      <p className="font-mono text-gray-600 text-sm mb-6">{description}</p>
      <button
        onClick={onAction}
        className="px-6 py-3 bg-black text-white rounded font-mono hover:bg-gray-800 transition duration-200"
      >
        {actionText}
      </button>
    </div>
  );
}
