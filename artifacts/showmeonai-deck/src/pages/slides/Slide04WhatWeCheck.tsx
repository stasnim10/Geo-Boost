export default function Slide04WhatWeCheck() {
  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{
        backgroundColor: "#FAFBFC",
        fontFamily: "'Inter', sans-serif",
        padding: "4vh 4vw",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "2fr 3fr",
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
          What We Check
        </div>
      </div>

      {/* Left — title */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.5vh" }}>
          The Audit
        </div>
        <h2
          style={{
            fontSize: "4vw",
            fontWeight: 800,
            margin: "0 0 2vh 0",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          What We Check
        </h2>
        <p style={{ fontSize: "1.4vw", color: "#475569", lineHeight: 1.6, margin: 0 }}>
          Four technical and content checks that determine whether AI assistants can find, understand, and cite your business.
        </p>
      </div>

      {/* Right — check list */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.8vh" }}>
        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            gap: "2vw",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              minWidth: "3vw",
              height: "3vw",
              backgroundColor: "rgba(13,148,136,0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1vw",
              fontWeight: 700,
              color: "#0D9488",
            }}
          >
            1
          </div>
          <div>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.5vh" }}>Bing Indexing</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              ChatGPT uses Bing to find business data. If Bing can't see you, ChatGPT can't cite you.
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            gap: "2vw",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              minWidth: "3vw",
              height: "3vw",
              backgroundColor: "rgba(13,148,136,0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1vw",
              fontWeight: 700,
              color: "#0D9488",
            }}
          >
            2
          </div>
          <div>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.5vh" }}>robots.txt Scanner</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              Many sites accidentally block GPTBot and other AI crawlers. We check for this hidden problem.
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            gap: "2vw",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              minWidth: "3vw",
              height: "3vw",
              backgroundColor: "rgba(13,148,136,0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1vw",
              fontWeight: 700,
              color: "#0D9488",
            }}
          >
            3
          </div>
          <div>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.5vh" }}>Content Specificity</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              AI favors factual, specific content over generic marketing language. We measure both readability and depth.
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            padding: "2.5vh 2.5vw",
            borderRadius: "1vw",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 12px rgba(30,58,95,0.06)",
            display: "flex",
            gap: "2vw",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              minWidth: "3vw",
              height: "3vw",
              backgroundColor: "rgba(13,148,136,0.1)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1vw",
              fontWeight: 700,
              color: "#0D9488",
            }}
          >
            4
          </div>
          <div>
            <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#1E3A5F", marginBottom: "0.5vh" }}>Schema Markup</div>
            <div style={{ fontSize: "1vw", color: "#64748B", lineHeight: 1.5 }}>
              JSON-LD structured data tells AI your hours, location, services, and reviews in a language it understands.
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
        <div>4 / 10</div>
      </div>
    </div>
  );
}
