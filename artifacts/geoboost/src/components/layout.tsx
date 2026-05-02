import { Link } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-[#0f172a] text-white py-4 px-6 md:px-12 flex items-center justify-between shadow-md">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">
              <path d="M2 12h4l3-9 5 18 3-9h5" />
            </svg>
          </div>
          GEOboost
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Audit</Link>
          <Link href="/optimizer" className="text-sm text-slate-300 hover:text-white transition-colors font-medium">Optimizer</Link>
        </nav>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
