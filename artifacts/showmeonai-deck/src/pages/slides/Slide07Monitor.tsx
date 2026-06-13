export default function Slide07Monitor() {
  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{
        backgroundColor: "#FAFBFC",
        fontFamily: "'Inter', sans-serif",
        padding: "4vh 4vw",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto 1fr auto",
        gap: "3vh",
        color: "#1E3A5F",
      }}
    >
      {/* Header */}
      <div
        style={{
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
          Monitor
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "3vw", alignItems: "center" }}>
        {/* Left — title + price */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2vh" }}>
          <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Weekly Intelligence
          </div>
          <h2 style={{ fontSize: "3.8vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Monitor: Weekly Intelligence
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5vw" }}>
            <div style={{ fontSize: "5vw", fontWeight: 800, color: "#0D9488", letterSpacing: "-0.04em" }}>$29</div>
            <div style={{ fontSize: "1.4vw", color: "#64748B" }}>/month</div>
          </div>
          <p style={{ fontSize: "1.4vw", color: "#475569", lineHeight: 1.6, margin: 0 }}>
            Built for business owners, not marketers. No dashboards to check — it comes to you.
          </p>
        </div>

        {/* Right — feature cards in a 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vw" }}>
          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 2vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Query Tracking
            </div>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "0.8vh" }}>5</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              AI queries monitored per week — phrases real customers ask
            </div>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 2vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Monday Reports
            </div>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "0.8vh" }}>Weekly</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              Score changes and priority actions, delivered Monday morning
            </div>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 2vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Competitor Alerts
            </div>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "0.8vh" }}>Instant</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              Alert when a competitor overtakes your AI ranking
            </div>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 2vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Re-Audits
            </div>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "0.8vh" }}>Auto</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              Automated weekly re-audits track how content changes improve your score
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
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
        <div>7 / 10</div>
      </div>
    </div>
  );
}
