"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export default function FAQ({ items }: FAQProps) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="mt-12">
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded border border-gray-200 overflow-hidden"
          >
            <button
              onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition duration-200"
            >
              <span className="font-mono font-semibold text-gray-900">
                {item.question}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  expandedFaq === index ? "rotate-180" : ""
                }`}
              />
            </button>
            {expandedFaq === index && (
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <div
                  className="font-mono text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
