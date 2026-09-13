import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function FixSuccess() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Payment Successful — Show me on AI";
    sessionStorage.setItem("fix_unlocked", "true");
    const t = setTimeout(() => navigate("/fix"), 800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-green-500" />
      <p className="text-slate-600 font-medium">Payment successful — loading your Fix Package…</p>
    </div>
  );
}
