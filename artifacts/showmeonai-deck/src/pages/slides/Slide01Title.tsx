export default function Slide01Title() {
  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{
        backgroundColor: "#FAFBFC",
        fontFamily: "'Inter', sans-serif",
        padding: "4vh 4vw",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "3fr 2fr",
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
          Generative Engine Optimization
        </div>
      </div>

      {/* Left — Hero content */}
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
          AI Visibility Platform
        </div>
        <h1
          style={{
            fontSize: "5.5vw",
            fontWeight: 800,
            margin: "0 0 2vh 0",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#1E3A5F",
            textWrap: "balance",
          }}
        >
          Show me on AI
        </h1>
        <p
          style={{
            fontSize: "1.8vw",
            fontWeight: 400,
            color: "#475569",
            margin: "0 0 1.5vh 0",
            lineHeight: 1.5,
            maxWidth: "38vw",
            textWrap: "pretty",
          }}
        >
          AI is recommending your competitors.
        </p>
        <p
          style={{
            fontSize: "1.8vw",
            fontWeight: 600,
            color: "#1E3A5F",
            margin: "0 0 4vh 0",
            lineHeight: 1.4,
          }}
        >
          Find out why — and fix it.
        </p>

        {/* KPI chips */}
        <div style={{ display: "flex", gap: "1.5vw" }}>
          <div
            style={{
              background: "#FFFFFF",
              padding: "2vh 2vw",
              borderRadius: "0.8vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 8px rgba(30,58,95,0.06)",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.8vh" }}>
              Audit Time
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8vw" }}>
              <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F" }}>60s</div>
              <div style={{ fontSize: "0.9vw", fontWeight: 600, color: "#0D9488", backgroundColor: "rgba(13,148,136,0.1)", padding: "0.3vh 0.6vw", borderRadius: "2vw" }}>
                Free
              </div>
            </div>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              padding: "2vh 2vw",
              borderRadius: "0.8vw",
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 8px rgba(30,58,95,0.06)",
            }}
          >
            <div style={{ fontSize: "0.85vw", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.8vh" }}>
              AI Assistants Tested
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.8vw" }}>
              <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F" }}>3</div>
              <div style={{ fontSize: "0.9vw", fontWeight: 600, color: "#0D9488", backgroundColor: "rgba(13,148,136,0.1)", padding: "0.3vh 0.6vw", borderRadius: "2vw" }}>
                ChatGPT · Claude · Gemini
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Score card visual */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            background: "#FFFFFF",
            padding: "4vh 3vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2.5vh",
            boxSizing: "border-box",
            boxShadow: "0 4px 20px rgba(30,58,95,0.08)",
          }}
        >
          <div style={{ fontSize: "1.1vw", fontWeight: 600, color: "#1E3A5F" }}>AI Visibility Score</div>

          <div style={{ display: "flex", alignItems: "center", gap: "2vw" }}>
            <div
              style={{
                width: "9vw",
                height: "9vw",
                borderRadius: "50%",
                border: "0.5vw solid #0D9488",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(13,148,136,0.06)",
              }}
            >
              <div style={{ fontSize: "3vw", fontWeight: 800, color: "#1E3A5F" }}>34</div>
              <div style={{ fontSize: "0.8vw", fontWeight: 600, color: "#64748B" }}>/ 100</div>
            </div>
            <div>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, color: "#EF4444", marginBottom: "0.5vh" }}>Critical</div>
              <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>AI assistants rarely</div>
              <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>cite this business</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "2vh", display: "flex", flexDirection: "column", gap: "1.2vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Citation rate</div>
              <div style={{ display: "flex", gap: "0.3vw" }}>
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Semantic density</div>
              <div style={{ display: "flex", gap: "0.3vw" }}>
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Structural formatting</div>
              <div style={{ display: "flex", gap: "0.3vw" }}>
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.9vw", color: "#64748B" }}>Technical access</div>
              <div style={{ display: "flex", gap: "0.3vw" }}>
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#0D9488", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
                <div style={{ width: "1.8vw", height: "0.5vh", backgroundColor: "#E2E8F0", borderRadius: "2px" }} />
              </div>
            </div>
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
        <div>showmeonai.com</div>
      </div>
    </div>
  );
}
