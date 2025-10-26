"use client";
import { ShieldX } from "lucide-react";

interface BlockConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function BlockConfirmation({
  onConfirm,
  onCancel,
  isSubmitting,
}: BlockConfirmationProps) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 p-4 rounded border border-red-200">
        <p className="font-mono text-sm text-red-800 mb-2">
          <strong>Block this user?</strong>
        </p>
        <p className="font-mono text-xs text-red-700">
          They won't appear in your matches again and you won't see each other.
        </p>
      </div>
      <div className="flex justify-center space-x-3">
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="px-6 py-2 bg-red-600 text-white rounded font-mono text-sm hover:bg-red-700 transition duration-200 disabled:opacity-50"
        >
          {isSubmitting ? "Blocking..." : "Confirm Block"}
        </button>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function BlockButton({
  onClick,
  isSubmitting,
}: {
  onClick: () => void;
  isSubmitting: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isSubmitting}
      className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded font-mono text-xs transition duration-200 disabled:opacity-50"
    >
      <ShieldX className="w-3 h-3" />
      <span>Block User</span>
    </button>
  );
}
