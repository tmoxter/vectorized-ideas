"use client";

import { useState, useEffect } from "react";

const phrases = [
  "your venture ideas",
  "your vision",
  "your challenges",
];

export default function TypewriterHero() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseDuration = 2000;

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
    <div className="text-4xl md:text-5xl font-mono font-bold text-gray-900 mb-6 leading-tight">
      <div>Use the similarity of</div>
      <div className="relative inline-block my-1">
        {/* Animated highlighter background */}
        <span
          className="absolute inset-0 bg-yellow-600 -z-10 transition-all duration-200 ease-out"
          style={{
            width: displayedText ? `${displayedText.length * 0.6}em` : "0em",
            height: "1em",
            top: "0.15em",
            left: "0",
          }}
        />
        {/* Text with cursor */}
        <span className="relative text-blue-600">
          {displayedText}
          <span className="animate-pulse">|</span>
        </span>
      </div>
      <div>to find and connect with co-founders</div>
    </div>
  );
}
