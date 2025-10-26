"use client";

interface PageHeaderProps {
  title: string;
  description?: string;
  highlight?: boolean;
}

export function PageHeader({
  title,
  description,
  highlight = false,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
        {highlight ? <span className="highlight-brush">{title}</span> : title}
      </h1>
      {description && (
        <p className="font-mono text-gray-600 text-sm">{description}</p>
      )}
    </div>
  );
}
