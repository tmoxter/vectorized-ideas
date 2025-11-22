'use client';

import { useState, useRef, useEffect } from 'react';
import { LogIn } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';

export default function MagneticLoginButton() {
  const [isHovering, setIsHovering] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  const text = "Continue with LinkedIn ";
  const chars = text.split('');

  // Handle LinkedIn OAuth login
  const handleLogin = async () => {
    setMessage("");

    try {
      const supabase = supabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` }
      });

      if (error) {
        setMessage("Error: " + error.message);
      }
    } catch (error) {
      setMessage("An unexpected error occurred");
    }
  };

  // Track mouse movement within the container
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !buttonRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();

      // Buffer to account for the text wheel radius (prevents overlap with adjacent elements)
      const buffer = 80; // roughly the radius of the text wheel

      // Check if mouse is in the hover region (with buffer)
      const isInRegion =
        e.clientX >= containerRect.left + buffer &&
        e.clientX <= containerRect.right &&
        e.clientY >= containerRect.top + buffer &&
        e.clientY <= containerRect.bottom - buffer;

      setIsHovering(isInRegion);

      if (isInRegion) {
        // Calculate container center (the default/rest position of the button)
        const containerCenterX = containerRect.left + containerRect.width / 2;
        const containerCenterY = containerRect.top + containerRect.height / 2;

        // Calculate offset needed to move button directly to mouse position
        let deltaX = e.clientX - containerCenterX;
        let deltaY = e.clientY - containerCenterY;

        // Clamp the position to stay within the buffer zone
        const maxX = (containerRect.width / 2) - buffer;
        const maxY = (containerRect.height / 2) - buffer;

        deltaX = Math.max(-maxX, Math.min(maxX, deltaX));
        deltaY = Math.max(-maxY, Math.min(maxY, deltaY));

        // Move button directly to mouse position
        setButtonPosition({
          x: deltaX,
          y: deltaY
        });
      } else {
        // Return to original position when mouse leaves
        setButtonPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
    >
      <div
        ref={buttonRef}
        onClick={handleLogin}
        className="relative cursor-pointer"
        style={{
          transform: `translate(${buttonPosition.x}px, ${buttonPosition.y}px)`,
          transition: isHovering ? 'transform 0.15s ease-out' : 'transform 0.7s ease-out'
        }}
      >
        {/* Circular rotating text */}
        <div
          className="relative w-48 h-48 flex items-center justify-center"
          style={{
            animation: isHovering ? 'spin 3s linear infinite' : 'spin 20s linear infinite'
          }}
        >
          {chars.map((char, index) => {
            const angle = (index / chars.length) * 360;
            return (
              <span
                key={index}
                className="absolute text-m font-mono text-gray-900"
                style={{
                  transform: `rotate(${angle}deg) translateY(-70px) rotate(0deg)`,
                  transformOrigin: 'center'
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <LogIn
            className="w-8 h-8 text-gray-900"
            strokeWidth={2}
          />
        </div>
      </div>

      {/* Error message */}
      {message && (
        <div className="absolute bottom-0 left-0 right-0 mt-3 p-3 rounded text-sm font-mono bg-red-50 text-red-600 border border-red-200">
          {message}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
