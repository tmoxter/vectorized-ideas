"use client";
import { Circles } from "react-loader-spinner";

export function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Circles color="#111827" width="24" height="24" visible={true} />
    </div>
  );
}
