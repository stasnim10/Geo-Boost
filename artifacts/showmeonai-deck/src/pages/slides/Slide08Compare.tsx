export default function Slide08Compare() {
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
          How It Compares
        </div>
      </div>

      {/* Title */}
      <div>
        <div style={{ fontSize: "1.1vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5vh" }}>
          Show me on AI vs. enterprise SEO tools
        </div>
        <h2 style={{ fontSize: "3vw", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          How It Compares
        </h2>
      </div>

      {/* Comparison table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "1vw",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 16px rgba(30,58,95,0.07)",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            padding: "1.5vh 2.5vw",
          }}
        >
          <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Feature</div>
          <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Show me on AI</div>
          <div style={{ fontSize: "0.9vw", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>Enterprise SEO Tools</div>
        </div>

        {/* Rows */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #F1F5F9", padding: "1.4vh 2.5vw", alignItems: "center" }}>
          <div style={{ fontSize: "1.1vw", color: "#1E3A5F", fontWeight: 500 }}>Built for</div>
          <div style={{ fontSize: "1vw", color: "#0D9488", fontWeight: 600, textAlign: "center" }}>Small business owners</div>
          <div style={{ fontSize: "1vw", color: "#64748B", textAlign: "center" }}>Marketing agencies</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #F1F5F9", padding: "1.4vh 2.5vw", alignItems: "center", background: "#FAFBFC" }}>
          <div style={{ fontSize: "1.1vw", color: "#1E3A5F", fontWeight: 500 }}>Free audit included</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#0D9488", textAlign: "center" }}>Yes</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#94A3B8", textAlign: "center" }}>No</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #F1F5F9", padding: "1.4vh 2.5vw", alignItems: "center" }}>
          <div style={{ fontSize: "1.1vw", color: "#1E3A5F", fontWeight: 500 }}>Results in plain English</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#0D9488", textAlign: "center" }}>Yes</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 700, color: "#94A3B8", textAlign: "center" }}>No</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #F1F5F9", padding: "1.4vh 2.5vw", alignItems: "center", background: "#FAFBFC" }}>
          <div style={{ fontSize: "1.1vw", color: "#1E3A5F", fontWeight: 500 }}>Fix package (one-time)</div>
          <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0D9488", textAlign: "center" }}>$49</div>
          <div style={{ fontSize: "1vw", color: "#94A3B8", textAlign: "center" }}>Not available</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: "1px solid #F1F5F9", padding: "1.4vh 2.5vw", alignItems: "center" }}>
          <div style={{ fontSize: "1.1vw", color: "#1E3A5F", fontWeight: 500 }}>Monthly subscription</div>
          <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0D9488", textAlign: "center" }}>From $29/month</div>
          <div style={{ fontSize: "1vw", color: "#64748B", textAlign: "center" }}>$200+/month</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "1.4vh 2.5vw", alignItems: "center", background: "#FAFBFC" }}>
          <div style={{ fontSize: "1.1vw", color: "#1E3A5F", fontWeight: 500 }}>Minimum contract</div>
          <div style={{ fontSize: "1vw", fontWeight: 700, color: "#0D9488", textAlign: "center" }}>None — cancel anytime</div>
          <div style={{ fontSize: "1vw", color: "#64748B", textAlign: "center" }}>Annual plans common</div>
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
        <div>8 / 10</div>
      </div>
    </div>
  );
}
