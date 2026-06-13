export default function Slide10GetStarted() {
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
          Get Started
        </div>
      </div>

      {/* Center content */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "3.5vh" }}>
        <div>
          <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5vh" }}>
            Free · No account required
          </div>
          <h2
            style={{
              fontSize: "5.5vw",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#1E3A5F",
              textWrap: "balance",
            }}
          >
            Get Started
          </h2>
        </div>

        <p
          style={{
            fontSize: "2vw",
            color: "#475569",
            lineHeight: 1.5,
            maxWidth: "55vw",
            margin: 0,
            textWrap: "pretty",
          }}
        >
          Free audit in 60 seconds — no account required.
        </p>

        <div
          style={{
            background: "#1E3A5F",
            padding: "3vh 6vw",
            borderRadius: "1vw",
            boxShadow: "0 8px 32px rgba(30,58,95,0.2)",
          }}
        >
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(13,148,136,0.9)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1vh" }}>
            Start your free audit at
          </div>
          <div style={{ fontSize: "3.5vw", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
            showmeonai.com
          </div>
          <div style={{ fontSize: "1.1vw", color: "rgba(255,255,255,0.6)", marginTop: "1vh" }}>
            See your AI Visibility Score today
          </div>
        </div>

        <div style={{ display: "flex", gap: "4vw" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#0D9488" }}>$0</div>
            <div style={{ fontSize: "1vw", color: "#64748B", marginTop: "0.5vh" }}>to get your score</div>
          </div>
          <div style={{ width: "1px", backgroundColor: "#E2E8F0" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#0D9488" }}>60s</div>
            <div style={{ fontSize: "1vw", color: "#64748B", marginTop: "0.5vh" }}>to complete</div>
          </div>
          <div style={{ width: "1px", backgroundColor: "#E2E8F0" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#0D9488" }}>3</div>
            <div style={{ fontSize: "1vw", color: "#64748B", marginTop: "0.5vh" }}>AI assistants tested</div>
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
        <div>showmeonai.com</div>
      </div>
    </div>
  );
}
