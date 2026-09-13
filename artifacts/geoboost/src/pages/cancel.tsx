import { useEffect } from "react";
import { Link } from "wouter";
import { XCircle } from "lucide-react";

export default function Cancel() {
  useEffect(() => {
    document.title = "Payment Cancelled — Show me on AI";
    return () => { document.title = "Show me on AI"; };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-8">
        <XCircle className="w-12 h-12 text-slate-400" strokeWidth={1.5} />
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
        No worries.
      </h1>

      <p className="text-lg text-slate-500 max-w-md mb-10">
        Your free audit results are still waiting for you.
      </p>

      <Link href="/results">
        <button
          style={{ backgroundColor: "#22c55e" }}
          className="hover:opacity-90 text-white font-bold px-10 py-4 rounded-lg text-lg transition-opacity border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
        >
          Back to My Results
        </button>
      </Link>

      <Link href="/">
        <span className="block mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
          Start a new audit
        </span>
      </Link>
    </div>
  );
}
