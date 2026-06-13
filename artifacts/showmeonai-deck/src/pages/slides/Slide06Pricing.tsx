export default function Slide06Pricing() {
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
        gridTemplateRows: "auto auto 1fr auto",
        gap: "2.5vh",
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
          Pricing
        </div>
      </div>

      {/* Title row */}
      <div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5vh" }}>
          Simple, transparent
        </div>
        <h2 style={{ fontSize: "3vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Pricing
        </h2>
      </div>

      {/* Pricing cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1.2vw", alignContent: "start" }}>
        {/* Free */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 1.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "1.2vh",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Free</div>
          <div style={{ fontSize: "2.8vw", fontWeight: 800, color: "#1E3A5F", lineHeight: 1 }}>$0</div>
          <div style={{ height: "1px", backgroundColor: "#E2E8F0" }} />
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>1 audit/month</div>
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>AI Visibility Score</div>
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>3 weaknesses identified</div>
        </div>

        {/* Fix */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 1.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "1.2vh",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fix</div>
          <div>
            <div style={{ fontSize: "2.8vw", fontWeight: 800, color: "#1E3A5F", lineHeight: 1 }}>$49</div>
            <div style={{ fontSize: "0.85vw", color: "#64748B" }}>one-time</div>
          </div>
          <div style={{ height: "1px", backgroundColor: "#E2E8F0" }} />
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>Full content rewrite</div>
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>Schema + GBP + social</div>
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>8-question FAQ</div>
        </div>

        {/* Monitor — highlighted */}
        <div
          style={{
            background: "#1E3A5F",
            padding: "2.5vh 1.5vw",
            borderRadius: "1vw",
            border: "2px solid #0D9488",
            boxShadow: "0 8px 24px rgba(30,58,95,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "1.2vh",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: "-1.5vh", left: "50%", transform: "translateX(-50%)", background: "#0D9488", color: "#FFFFFF", fontSize: "0.8vw", fontWeight: 700, padding: "0.3vh 1vw", borderRadius: "2vw", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Most Popular
          </div>
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Monitor</div>
          <div>
            <div style={{ fontSize: "2.8vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1 }}>$29</div>
            <div style={{ fontSize: "0.85vw", color: "rgba(255,255,255,0.6)" }}>/month</div>
          </div>
          <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.2)" }} />
          <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>Weekly re-audits</div>
          <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>5 AI queries tracked</div>
          <div style={{ fontSize: "0.95vw", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>Monday email reports</div>
        </div>

        {/* Grow */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 1.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "1.2vh",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Grow</div>
          <div>
            <div style={{ fontSize: "2.8vw", fontWeight: 800, color: "#1E3A5F", lineHeight: 1 }}>$99</div>
            <div style={{ fontSize: "0.85vw", color: "#64748B" }}>/month</div>
          </div>
          <div style={{ height: "1px", backgroundColor: "#E2E8F0" }} />
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>3 domains</div>
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>20 queries tracked</div>
          <div style={{ fontSize: "0.95vw", color: "#64748B", lineHeight: 1.6 }}>Competitor comparison</div>
        </div>

        {/* Done For You */}
        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 1.5vw",
            borderRadius: "1vw",
            border: "1px dashed #CBD5E1",
            display: "flex",
            flexDirection: "column",
            gap: "1.2vh",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Done For You</div>
          <div>
            <div style={{ fontSize: "2.8vw", fontWeight: 800, color: "#94A3B8", lineHeight: 1 }}>$399</div>
            <div style={{ fontSize: "0.85vw", color: "#94A3B8" }}>/month</div>
          </div>
          <div style={{ height: "1px", backgroundColor: "#E2E8F0" }} />
          <div style={{ fontSize: "0.95vw", color: "#94A3B8", lineHeight: 1.6 }}>Auto-publishing</div>
          <div style={{ fontSize: "0.95vw", color: "#94A3B8", lineHeight: 1.6 }}>Account manager</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4vw", background: "#F1F5F9", padding: "0.4vh 0.8vw", borderRadius: "2vw", width: "fit-content" }}>
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B" }}>Waitlist</div>
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
        <div>6 / 10</div>
      </div>
    </div>
  );
}
