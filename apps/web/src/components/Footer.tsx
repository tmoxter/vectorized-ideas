"use client";

export default function Footer() {
  return (
    <footer className="border-t border-gray-300 py-8 px-6 mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-200">
                <span className="text-black font-mono text">{"\u{1D708}"}</span>
              </div>
              <span className="font-mono text-sm text-gray-700">
                vectorized-ideas
              </span>
            </div>
            <p className="text-gray-500 text-sm font-mono">
              semantically-aware co-founder matching experiment
            </p>
          </div>

          <div className="flex space-x-6 text-sm font-mono">
            <a href="#" className="text-gray-500 hover:text-gray-700">
              github
            </a>
          </div>
        </div>

        <div className="border-t border-gray-300 mt-6 pt-6 text-center">
          <p className="text-gray-400 text-xs font-mono">
            built with care and spare time
          </p>
        </div>
      </div>
    </footer>
  );
}
