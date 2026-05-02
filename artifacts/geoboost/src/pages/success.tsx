import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";

export default function Success() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-20 px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-8">
        <CheckCircle2 className="w-14 h-14 text-green-500" strokeWidth={1.5} />
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
        You're in. Welcome to GEOboost Pro.
      </h1>

      <p className="text-lg text-slate-500 max-w-lg mb-10">
        Your account is active. Start optimizing your content to get found by
        ChatGPT, Claude, and Perplexity.
      </p>

      <Link href="/optimizer">
        <button
          style={{ backgroundColor: "#22c55e" }}
          className="hover:opacity-90 text-white font-bold px-10 py-4 rounded-lg text-lg transition-opacity border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
        >
          Start Optimizing Now
        </button>
      </Link>

      <Link href="/">
        <span className="block mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
          Back to home
        </span>
      </Link>
    </div>
  );
}
