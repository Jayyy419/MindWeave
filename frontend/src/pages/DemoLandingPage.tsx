import { useNavigate } from "react-router-dom";
import { MAX_DEMO_REFRAMES } from "@/config/demo";
import { Sparkles } from "lucide-react";

export function DemoLandingPage() {
  const navigate = useNavigate();

  function handleEnterDemo() {
    navigate("/journal");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Brand */}
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          MindWeave
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered journaling with live cognitive reframing
        </p>

        {/* CTA */}
        <button
          onClick={handleEnterDemo}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-100"
        >
          <Sparkles className="h-5 w-5" />
          Let's try MindWeave!
        </button>

        {/* Info box */}
        <div className="mx-auto max-w-md rounded-xl border border-purple-200 bg-white/80 p-5 text-sm text-muted-foreground shadow-sm space-y-2">
          <p className="font-medium text-foreground">Demo Mode</p>
          <ul className="list-disc list-inside space-y-1 text-left">
            <li>No account or sign-up required</li>
            <li>You get <strong>{MAX_DEMO_REFRAMES} live reframes</strong> to explore</li>
            <li>Journal entries are not saved in demo mode</li>
            <li>Create a free account later for the full experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
