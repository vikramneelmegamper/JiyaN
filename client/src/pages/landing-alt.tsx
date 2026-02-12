import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, ArrowRight, Sparkles, Heart, Clock, Target, Star, Gift, Moon, Sun } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "@/firebase";
import { useEffect } from "react";

export default function LandingPage() {
  // Set dark theme as default for landing page
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Artistic background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large geometric shapes */}
        <div className="absolute top-10 left-10 w-40 h-40 border-2 border-purple-400/20 rounded-full animate-spin-slow"></div>
        <div className="absolute top-20 right-20 w-32 h-32 border border-blue-400/20 rotate-45 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg rotate-12 animate-bounce"></div>

        {/* Floating particles */}
        <div className="absolute top-1/3 left-1/4 animate-float">
          <div className="w-3 h-3 bg-purple-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-2/3 right-1/3 animate-float-delayed">
          <div className="w-2 h-2 bg-blue-400 rounded-full opacity-50"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/2 animate-float">
          <div className="w-4 h-4 bg-indigo-400 rounded-full opacity-40"></div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Hero section with artistic layout */}
          <div className="text-center mb-20">
            {/* Creative title layout */}
            <div className="relative mb-12">
              <h1 className="text-7xl lg:text-9xl font-black tracking-tighter mb-4">
                <span className="block bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent animate-pulse">
                  ROSE
                </span>
                <span className="block text-5xl lg:text-7xl text-white font-light tracking-wide">
                  BOARD
                </span>
              </h1>

              {/* Decorative line */}
              <div className="flex justify-center items-center gap-4 mt-8">
                <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent w-24"></div>
                <Sparkles className="h-6 w-6 text-purple-400 animate-pulse" />
                <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent w-24"></div>
              </div>
            </div>

            {/* Personal message in artistic card */}
            <Card className="inline-block glass rounded-3xl p-8 border-0 shadow-2xl bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-xl mb-12">
              <div className="text-center">
                <div className="flex justify-center items-center gap-3 mb-4">
                  <Heart className="h-5 w-5 text-red-400 animate-pulse" />
                  <span className="text-lg font-medium text-purple-200">A Personal Invitation</span>
                  <Heart className="h-5 w-5 text-red-400 animate-pulse" />
                </div>
                <p className="text-xl text-blue-100 leading-relaxed max-w-2xl">
                  Step into your creative sanctuary, where productivity meets artistry.
                  A space designed exclusively for your journey of growth and achievement.
                </p>
              </div>
            </Card>
          </div>

          {/* Feature showcase in artistic grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            {/* Left column - Focus */}
            <div className="space-y-8">
              <Card className="glass rounded-3xl p-8 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl group">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                      <Clock className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                      <Star className="h-4 w-4 text-yellow-900" />
                    </div>
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-purple-100">Deep Focus</h3>
                  <p className="text-purple-200 leading-relaxed">
                    Immerse yourself in distraction-free work sessions with elegant timers
                    that respect your creative flow.
                  </p>
                </div>
              </Card>

              <Card className="glass rounded-3xl p-8 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 backdrop-blur-xl group">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                      <Target className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                      <Gift className="h-4 w-4 text-green-900" />
                    </div>
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-blue-100">Goal Mastery</h3>
                  <p className="text-blue-200 leading-relaxed">
                    Transform aspirations into achievements with intelligent task management
                    that adapts to your workflow.
                  </p>
                </div>
              </Card>
            </div>

            {/* Center column - Main CTA */}
            <div className="flex items-center justify-center">
              <Card className="glass rounded-3xl p-12 border-0 shadow-2xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 backdrop-blur-xl text-center">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-4">Begin Your Journey</h2>
                    <p className="text-indigo-200 leading-relaxed">
                      Your productivity masterpiece awaits. Every great achievement
                      starts with a single, beautiful step.
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="rounded-3xl px-12 py-8 text-xl font-bold shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-110 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 hover:from-purple-400 hover:via-indigo-400 hover:to-blue-400 border-0"
                    onClick={handleSignIn}
                  >
                    <LogIn className="mr-4 h-7 w-7" />
                    Enter the Experience
                    <ArrowRight className="ml-4 h-7 w-7" />
                  </Button>

                  <div className="flex justify-center items-center gap-6 text-sm text-indigo-300">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-blue-400" />
                      <span>Dark Mode Ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-yellow-400" />
                      <span>Light Mode Available</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right column - Progress */}
            <div className="space-y-8">
              <Card className="glass rounded-3xl p-8 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-xl group">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center animate-pulse">
                      <Heart className="h-4 w-4 text-pink-900" />
                    </div>
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-cyan-100">Progress Poetry</h3>
                  <p className="text-cyan-200 leading-relaxed">
                    Watch your efforts blossom into beautiful visualizations that inspire
                    continued growth and celebration.
                  </p>
                </div>
              </Card>

              <Card className="glass rounded-3xl p-8 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl group">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform duration-500">
                      <Star className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center animate-bounce">
                      <Gift className="h-4 w-4 text-orange-900" />
                    </div>
                  </div>
                  <h3 className="font-bold text-2xl mb-4 text-indigo-100">Achievement Art</h3>
                  <p className="text-indigo-200 leading-relaxed">
                    Every milestone becomes a masterpiece. Celebrate your journey
                    with elegant progress tracking and meaningful rewards.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Footer message */}
          <div className="text-center">
            <Card className="inline-block glass rounded-3xl p-6 border-0 shadow-xl bg-gradient-to-r from-slate-900/50 to-purple-900/50 backdrop-blur-xl">
              <div className="flex items-center justify-center gap-3 text-slate-300">
                <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
                <span className="text-lg font-medium">Crafted with artistic vision and loving care</span>
                <Heart className="h-5 w-5 text-red-400 animate-pulse" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}