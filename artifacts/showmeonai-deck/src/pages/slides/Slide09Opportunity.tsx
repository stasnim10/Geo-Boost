export default function Slide09Opportunity() {
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
          The Opportunity
        </div>
      </div>

      {/* Left — headline + stat */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5vh" }}>
          Market timing
        </div>
        <h2 style={{ fontSize: "3.8vw", fontWeight: 800, margin: "0 0 2.5vh 0", lineHeight: 1.1, letterSpacing: "-0.02em", textWrap: "balance" }}>
          The Opportunity
        </h2>
        <div
          style={{
            background: "#FFFFFF",
            padding: "3vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 16px rgba(30,58,95,0.07)",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1vh" }}>
            AI Search Growth
          </div>
          <div style={{ fontSize: "6vw", fontWeight: 800, color: "#0D9488", lineHeight: 1, letterSpacing: "-0.04em" }}>40%+</div>
          <div style={{ fontSize: "1.2vw", color: "#475569", marginTop: "1vh", lineHeight: 1.5 }}>
            of online searches now go through AI assistants
          </div>
        </div>
      </div>

      {/* Right — insight cards */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1vh" }}>
            Channel shift
          </div>
          <div style={{ fontSize: "1.3vw", color: "#1E3A5F", fontWeight: 500, lineHeight: 1.5 }}>
            AI search is the fastest-growing discovery channel for local and service businesses.
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1vh" }}>
            Unaddressed market
          </div>
          <div style={{ fontSize: "1.3vw", color: "#1E3A5F", fontWeight: 500, lineHeight: 1.5 }}>
            Most small businesses have no strategy for AI visibility. The tools that exist are built for agencies.
          </div>
        </div>

        <div
          style={{
            background: "#1E3A5F",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #1E3A5F",
            boxShadow: "0 4px 16px rgba(30,58,95,0.15)",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "rgba(13,148,136,0.9)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1vh" }}>
            First-mover advantage
          </div>
          <div style={{ fontSize: "1.3vw", color: "rgba(255,255,255,0.9)", fontWeight: 500, lineHeight: 1.5 }}>
            First-mover advantage is available right now. Early action compounds — AI systems reinforce what they already cite.
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
        <div>9 / 10</div>
      </div>
    </div>
  );
}
