interface ProfileSectionProps {
  title: string;
  content?: string;
  subtitle?: string;
}

export function ProfileSection({ title, content, subtitle }: ProfileSectionProps) {
  if (!content && !subtitle) return null;

  return (
    <section>
      <h3 className="text-lg font-mono font-semibold text-gray-900 mb-3">
        {title}
      </h3>
      {subtitle && (
        <h4 className="font-mono font-semibold text-gray-800 mb-2">
          {subtitle}
        </h4>
      )}
      {content && (
        <p className="font-mono text-sm text-gray-700 leading-relaxed">
          {content}
        </p>
      )}
    </section>
  );
}
