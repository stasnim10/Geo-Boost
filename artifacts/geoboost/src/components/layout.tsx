import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Show, useUser, useClerk } from "@clerk/react";
import { LayoutDashboard, LogOut, ChevronDown, Loader2 } from "lucide-react";

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const name = user?.firstName || user?.emailAddresses[0]?.emailAddress?.split("@")[0] || "Account";
  const initials = name.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ redirectUrl: "/" });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <span className="text-sm text-slate-300 hidden sm:block">{name}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900 truncate">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <Link href="/dashboard" onClick={() => setOpen(false)}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              My Audits
            </button>
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
          >
            {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-[#0f172a] text-white py-4 px-6 md:px-12 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l3-9 5 18 3-9h5" />
            </svg>
          </div>
          GEOboost
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">
            Audit
          </Link>
          <Link href="/optimizer" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">
            Optimizer
          </Link>

          <Show when="signed-in">
            <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white transition-colors font-medium hidden sm:block">
              Dashboard
            </Link>
            <UserMenu />
          </Show>

          <Show when="signed-out">
            <Link href="/sign-in">
              <button className="text-sm text-slate-300 hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/10">
                Sign In
              </button>
            </Link>
            <Link href="/sign-up">
              <button className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-white transition-colors">
                Get Started
              </button>
            </Link>
          </Show>
        </nav>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
