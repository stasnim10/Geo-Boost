export default function Slide03Score() {
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
          AI Visibility Score
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.8vh" }}>
            How it works
          </div>
          <h2 style={{ fontSize: "3.5vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            AI Visibility Score
          </h2>
          <p style={{ fontSize: "1.5vw", color: "#475569", margin: "1vh 0 0 0", lineHeight: 1.5 }}>
            We test 3 AI assistants with queries real customers ask. Every business gets a score from 0–100.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5vw" }}>
          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 1.5vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Citation Rate
            </div>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "1vh" }}>01</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              How often AI assistants mention your business by name
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 1.5vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Semantic Density
            </div>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "1vh" }}>02</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              Specific, helpful information vs. vague marketing language
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 1.5vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Structural Formatting
            </div>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "1vh" }}>03</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              AI-readable elements: bullet points, clear headings, FAQ sections
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              padding: "3vh 1.5vw",
              borderRadius: "1vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5vh" }}>
              Technical Access
            </div>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F", marginBottom: "1vh" }}>04</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              Bing indexing, robots.txt, schema markup — can AI crawlers reach you?
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 3vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            alignItems: "center",
            gap: "4vw",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "2vw" }}>
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#64748B" }}>Score</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <div style={{ width: "4vw", height: "0.8vh", background: "linear-gradient(to right, #EF4444, #F59E0B)", borderRadius: "2px" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B" }}>0–39 Critical</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <div style={{ width: "4vw", height: "0.8vh", background: "linear-gradient(to right, #F59E0B, #EAB308)", borderRadius: "2px" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B" }}>40–69 Needs Work</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <div style={{ width: "4vw", height: "0.8vh", background: "linear-gradient(to right, #22C55E, #0D9488)", borderRadius: "2px" }} />
              <div style={{ fontSize: "0.85vw", color: "#64748B" }}>70–100 Good</div>
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>
            Results in 60 seconds · No tech knowledge needed
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
        <div>3 / 10</div>
      </div>
    </div>
  );
}
