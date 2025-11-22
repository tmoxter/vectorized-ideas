"use client";

import { useState, useEffect } from "react";

const phrases = [
  "your venture ideas",
  "your side projects",
  "your research interests",
];

export default function TypewriterHero() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingSpeed = isDeleting ?40 : 60;
    const pauseDuration = 3000;

    if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause at the end of the phrase
      const timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex === 0) {
      // Move to next phrase
      setIsDeleting(false);
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(currentPhrase.substring(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      } else {
        setDisplayedText(currentPhrase.substring(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentPhraseIndex]);

  return (
    <div className="text-4xl md:text-6xl font-mono font-bold text-gray-900 mb-6 leading-tight">
      <div>Find co-founders</div>
      <div>based on the similarity of</div>
      <div className="relative inline-block my-1 min-h-[1em]">
        <span className="inline-block min-w-[1ch] text-black-600">
          {displayedText}
          <span className="animate-blink">_</span>
        </span>
      </div>
    </div>
  );
}
