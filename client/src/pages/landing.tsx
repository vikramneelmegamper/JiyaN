import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { GoogleSignInButtonWithLogo } from "@/components/ui/google-signin-button";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/firebase";
import { useEffect, useRef, useState } from "react";

export default function LandingPage() {
  // Remove dark theme for light background
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => container.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen relative overflow-hidden cursor-default"
      style={{
        backgroundColor: '#FAF7F2',
        background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(226, 179, 90, 0.08) 0%, transparent 50%), linear-gradient(135deg, #FAF7F2 0%, #FAFBF7 100%)`,
      }}
    >
      {/* Subtle grain / vignette overlay */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
        backgroundColor: '#F1ECE4',
        mixBlendMode: 'overlay'
      }}></div>

      <div className="relative z-10 container mx-auto px-6 h-screen flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl mx-auto text-center space-y-12">
          
          {/* Main Title & Subtitle - Minimal and serene */}
          <div className="space-y-2" style={{ marginTop: '-80px' }}>
            <h1 className="text-7xl md:text-8xl font-light tracking-tight" style={{ 
              color: '#3B2F2A',
              animation: 'gentleFadeIn 2.5s ease-out forwards',
              opacity: 0,
              fontFamily: 'Fraunces, serif'
            }}>
              To-do
            </h1>
            <p className="text-lg md:text-xl font-light" style={{ 
              color: '#7A6E65',
              animation: 'gentleFadeIn 2.5s ease-out 0.1s forwards',
              opacity: 0
            }}>
              Jiya's Space
            </p>
          </div>

          {/* Sign In Section with delicate framing */}
          <div className="space-y-8 pt-8" style={{ 
            animation: 'gentleFadeIn 2.5s ease-out 0.2s forwards',
            opacity: 0
          }}>
            {/* Top delicate line */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #E8E2D9, transparent)',
            }}></div>

            {/* Sign In Button - Custom Google Sign-in Button */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleSignInButtonWithLogo
                onClick={handleSignIn}
                text="Continue with Google"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#3B2F2A',
                  color: '#3B2F2A',
                }}
              />
            </div>

            {/* Bottom delicate line */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #E8E2D9, transparent)',
            }}></div>
          </div>

        </div>
      </div>

      {/* Cursor glow - subtle golden presence */}
      <div 
        className="fixed pointer-events-none will-change-transform"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          boxShadow: `0 0 40px rgba(226, 179, 90, 0.1)`,
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
          transform: 'translate(-50%, -50%)',
          transition: 'left 0.2s ease-out, top 0.2s ease-out',
          zIndex: 5
        }}
      ></div>

      {/* Custom animation keyframes */}
      <style>{`
        @keyframes gentleFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}