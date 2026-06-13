export default function Slide05FixPackage() {
  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{
        backgroundColor: "#FAFBFC",
        fontFamily: "'Inter', sans-serif",
        padding: "4vh 4vw",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto 1fr auto",
        gap: "3vh 4vw",
        color: "#1E3A5F",
      }}
    >
      {/* Header */}
      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: "2vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.8vw" }}>
          <div style={{ width: "2vw", height: "2vw", backgroundColor: "#0D9488", borderRadius: "0.4vw" }} />
          <div style={{ fontSize: "1.2vw", fontWeight: 700, letterSpacing: "0.02em" }}>showmeonai.com</div>
        </div>
        <div style={{ fontSize: "1vw", fontWeight: 500, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Fix Package
        </div>
      </div>

      {/* Left — stat hero */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5vh" }}>
          One-time
        </div>
        <div style={{ fontSize: "10vw", fontWeight: 800, color: "#1E3A5F", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: "1vh" }}>
          $49
        </div>
        <div style={{ fontSize: "1.6vw", color: "#475569", lineHeight: 1.5, marginBottom: "2vh" }}>
          Everything you need to become AI-visible. Pay once, keep the assets forever.
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.8vw",
            background: "rgba(13,148,136,0.08)",
            padding: "1.2vh 1.5vw",
            borderRadius: "0.6vw",
            border: "1px solid rgba(13,148,136,0.2)",
            width: "fit-content",
          }}
        >
          <div style={{ width: "0.8vw", height: "0.8vw", borderRadius: "50%", backgroundColor: "#0D9488" }} />
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#0D9488" }}>No subscription required</div>
        </div>
      </div>

      {/* Right — deliverables */}
      <div
        style={{
          background: "#FFFFFF",
          padding: "3.5vh 3vw",
          borderRadius: "1vw",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 20px rgba(30,58,95,0.08)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1.8vh",
        }}
      >
        <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#1E3A5F", borderBottom: "1px solid #E2E8F0", paddingBottom: "1.5vh", marginBottom: "0.5vh" }}>
          What you receive
        </div>

        <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
          <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#0D9488", marginTop: "0.5vh", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>AI-optimized content rewrite</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B" }}>Full website text rewritten for AI citation</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
          <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#0D9488", marginTop: "0.5vh", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>JSON-LD schema generation</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B" }}>Structured data code ready to paste into your site</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
          <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#0D9488", marginTop: "0.5vh", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Google Business Profile copy</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B" }}>AI-tailored description and category optimization</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
          <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#0D9488", marginTop: "0.5vh", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>Social media bio rewrites</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B" }}>Platform-specific bios that AI can pull from</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.2vw", alignItems: "flex-start" }}>
          <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#0D9488", marginTop: "0.5vh", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>8-question FAQ section</div>
            <div style={{ fontSize: "0.95vw", color: "#64748B" }}>The format AI assistants quote most often</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #E2E8F0",
          paddingTop: "1.5vh",
          fontSize: "0.9vw",
          color: "#94A3B8",
          fontWeight: 500,
        }}
      >
        <div>Show me on AI</div>
        <div>5 / 10</div>
      </div>
    </div>
  );
}
