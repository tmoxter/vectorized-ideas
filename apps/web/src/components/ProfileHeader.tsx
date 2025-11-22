"use client";

interface ProfileHeaderProps {
  name: string;
  cityName?: string;
  country?: string;
  timezone?: string;
  stage?: string;
  similarityScore?: number;
  requestDate?: string;
}

export function ProfileHeader({
  name,
  cityName,
  country,
  timezone,
  stage,
  similarityScore,
  requestDate,
}: ProfileHeaderProps) {
  return (
    <div className="p-6 border-b-1 border-gray-500">
      <div className="flex items-start justify-between">
        <div>
          <h2
            className="text-2xl font-mono font-bold bg-clip-text text-transparent mb-2"
            style={{
              backgroundImage: 'linear-gradient(135deg, rgb(183, 167, 248) 0%, rgb(107, 168, 244) 50%, rgb(253, 191, 172) 100%)'
            }}
          >
            {name}
          </h2>
          <div className="flex items-center space-x-4 text-sm font-mono text-gray-600">
            {cityName && country && (
              <span>
                📍 {cityName}, {country}
              </span>
            )}
            {timezone && <span>🕒 {timezone}</span>}
            {stage && <span>🚀 {stage}</span>}
          </div>
        </div>
        {similarityScore && (
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-green-600">
              {Math.round(similarityScore)}%
            </div>
            <div className="text-xs font-mono text-gray-500">
              similarity score
            </div>
          </div>
        )}
        {requestDate && (
          <div className="text-right">
            <div className="text-xs font-mono text-gray-500">
              request received
            </div>
            <div className="text-sm font-mono text-gray-700">
              {new Date(requestDate).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
