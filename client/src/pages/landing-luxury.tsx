import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn, ArrowRight, Sparkles, Heart, Clock, Target, Star, Crown } from "lucide-react";
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Luxury background */}
      <div className="absolute inset-0">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>

        {/* Elegant pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M0 0h80v80H0V0zm20 20h40v40H20V20z'/%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating luxury elements */}
        <div className="absolute top-20 left-20 animate-float-slow">
          <Crown className="h-8 w-8 text-yellow-500/20" />
        </div>
        <div className="absolute top-40 right-32 animate-float-slow-delayed">
          <Star className="h-6 w-6 text-blue-400/20" />
        </div>
        <div className="absolute bottom-32 left-40 animate-float-slow">
          <Sparkles className="h-7 w-7 text-purple-400/20" />
        </div>
        <div className="absolute bottom-20 right-40 animate-float-slow-delayed">
          <Heart className="h-6 w-6 text-red-400/20" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Elegant header */}
          <div className="mb-20">
            {/* Crown decoration */}
            <div className="flex justify-center mb-8">
              <Crown className="h-12 w-12 text-yellow-500 animate-pulse" />
            </div>

            {/* Main title */}
            <h1 className="text-6xl lg:text-8xl font-black tracking-tight mb-8">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-white animate-pulse">
                ROSEBOARD
              </span>
            </h1>

            {/* Elegant subtitle */}
            <div className="max-w-2xl mx-auto">
              <p className="text-2xl lg:text-3xl text-gray-300 mb-6 leading-relaxed font-light">
                An exquisite sanctuary for your productivity journey
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                Where elegance meets efficiency, crafted exclusively for those who
                demand the finest in personal organization.
              </p>
            </div>
          </div>

          {/* Luxury feature showcase */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <Card className="glass rounded-2xl p-8 border border-gray-800 shadow-2xl bg-gray-900/50 backdrop-blur-xl hover:bg-gray-800/50 transition-all duration-500 hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg mb-6 mx-auto">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-white">Precision Timing</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Master your time with sophisticated focus sessions designed for peak performance.
                </p>
              </div>
            </Card>

            <Card className="glass rounded-2xl p-8 border border-gray-800 shadow-2xl bg-gray-900/50 backdrop-blur-xl hover:bg-gray-800/50 transition-all duration-500 hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg mb-6 mx-auto">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-white">Strategic Planning</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Organize your ambitions with refined task management that elevates your goals.
                </p>
              </div>
            </Card>

            <Card className="glass rounded-2xl p-8 border border-gray-800 shadow-2xl bg-gray-900/50 backdrop-blur-xl hover:bg-gray-800/50 transition-all duration-500 hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center shadow-lg mb-6 mx-auto">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-white">Elegant Analytics</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Witness your progress unfold in sophisticated visualizations of achievement.
                </p>
              </div>
            </Card>
          </div>

          {/* Luxury CTA section */}
          <div className="space-y-12">
            {/* Personal invitation */}
            <Card className="inline-block glass rounded-3xl p-8 border border-gray-700 shadow-2xl bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl">
              <div className="flex items-center gap-4 text-gray-200">
                <Heart className="h-6 w-6 text-red-400 animate-pulse" />
                <div className="text-center">
                  <p className="text-lg font-medium">A Personal Invitation</p>
                  <p className="text-sm text-gray-400">Exclusively crafted for you</p>
                </div>
                <Heart className="h-6 w-6 text-red-400 animate-pulse" />
              </div>
            </Card>

            {/* Premium CTA button */}
            <div className="space-y-6">
              <Button
                size="lg"
                className="rounded-2xl px-16 py-8 text-xl font-bold shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 hover:scale-105 bg-gradient-to-r from-yellow-600 via-yellow-500 to-orange-500 hover:from-yellow-500 hover:via-yellow-400 hover:to-orange-400 border-0 text-black"
                onClick={handleSignIn}
              >
                <LogIn className="mr-4 h-7 w-7" />
                Access Your Sanctuary
                <ArrowRight className="ml-4 h-7 w-7" />
              </Button>

              <div className="flex justify-center items-center gap-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Premium Experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-400" />
                  <span>Personal Touch</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-400" />
                  <span>Timeless Design</span>
                </div>
              </div>
            </div>
          </div>

          {/* Elegant footer */}
          <div className="mt-20 pt-12 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              "Excellence is not a skill. It is an attitude." — Ralph Marston
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}