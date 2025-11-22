import { MoveDownLeft } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h2 className="flex items-end gap-2 text-xl font-mono font-bold mb-6">
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgb(183, 167, 248) 0%, rgb(107, 168, 244) 50%, rgb(253, 191, 172) 100%)'
        }}
      >
        {title}
      </span>
      <MoveDownLeft
        className="w-6 h-6 mt-1.5"
        style={{
          color: 'rgb(107, 168, 244)'
        }}
      />
    </h2>
  );
}
