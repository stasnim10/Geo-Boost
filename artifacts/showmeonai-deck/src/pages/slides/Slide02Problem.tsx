export default function Slide02Problem() {
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
          The Problem
        </div>
      </div>

      {/* Left — headline */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            fontSize: "1.1vw",
            fontWeight: 700,
            color: "#0D9488",
            marginBottom: "1.5vh",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Search has changed
        </div>
        <h2
          style={{
            fontSize: "4vw",
            fontWeight: 800,
            margin: "0 0 2.5vh 0",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          The Problem
        </h2>
        <p
          style={{
            fontSize: "1.7vw",
            fontWeight: 400,
            color: "#475569",
            lineHeight: 1.6,
            margin: "0 0 1.5vh 0",
            textWrap: "pretty",
          }}
        >
          ChatGPT, Claude, and Google AI now answer questions your customers used to Google.
        </p>
        <p
          style={{
            fontSize: "1.7vw",
            fontWeight: 600,
            color: "#1E3A5F",
            lineHeight: 1.5,
            margin: "0 0 1.5vh 0",
          }}
        >
          If your business isn't in those answers, you're invisible.
        </p>
        <p
          style={{
            fontSize: "1.5vw",
            fontWeight: 400,
            color: "#64748B",
            lineHeight: 1.5,
          }}
        >
          Most small businesses don't know they have an AI visibility problem.
        </p>
      </div>

      {/* Right — visual contrast panel */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" }}>
        <div
          style={{
            background: "#FFFFFF",
            padding: "3vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 16px rgba(30,58,95,0.07)",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5vh" }}>
            Before AI Search
          </div>
          <div style={{ fontSize: "1.3vw", color: "#475569", lineHeight: 1.6 }}>
            Customer types <span style={{ fontWeight: 600, color: "#1E3A5F" }}>"best plumber near me"</span> into Google.
          </div>
          <div style={{ marginTop: "1.2vh", fontSize: "1.3vw", color: "#475569", lineHeight: 1.6 }}>
            Your website appears. They click.
          </div>
          <div style={{ marginTop: "1.2vh", display: "inline-flex", alignItems: "center", gap: "0.5vw", background: "rgba(13,148,136,0.08)", padding: "0.6vh 1vw", borderRadius: "0.5vw" }}>
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#0D9488" }} />
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#0D9488" }}>Visible</div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "3vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #FCA5A5",
            boxShadow: "0 4px 16px rgba(239,68,68,0.06)",
          }}
        >
          <div style={{ fontSize: "0.85vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.5vh" }}>
            After AI Search
          </div>
          <div style={{ fontSize: "1.3vw", color: "#475569", lineHeight: 1.6 }}>
            Customer asks ChatGPT <span style={{ fontWeight: 600, color: "#1E3A5F" }}>"best plumber in [city]"</span>.
          </div>
          <div style={{ marginTop: "1.2vh", fontSize: "1.3vw", color: "#475569", lineHeight: 1.6 }}>
            AI recommends 3 competitors. You're not mentioned.
          </div>
          <div style={{ marginTop: "1.2vh", display: "inline-flex", alignItems: "center", gap: "0.5vw", background: "rgba(239,68,68,0.08)", padding: "0.6vh 1vw", borderRadius: "0.5vw" }}>
            <div style={{ width: "0.7vw", height: "0.7vw", borderRadius: "50%", backgroundColor: "#EF4444" }} />
            <div style={{ fontSize: "1vw", fontWeight: 600, color: "#EF4444" }}>Invisible</div>
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
        <div>2 / 10</div>
      </div>
    </div>
  );
}
