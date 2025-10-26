"use client";
import { LucideIcon } from "lucide-react";

interface NavigationCardProps {
  Icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function NavigationCard({
  Icon,
  title,
  description,
  onClick,
}: NavigationCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-6 bg-white rounded border border-gray-200 text-left hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded flex items-center justify-center mb-4 icon-gradient group-hover:scale-110 transition-transform duration-200">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 text-sm font-mono">{description}</p>
    </button>
  );
}
