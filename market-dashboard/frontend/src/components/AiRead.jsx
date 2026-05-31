import React from "react";

// Highlighted inline commentary block, shown under every section/chart/table.
// Tagged "AI read" when written by the model, "Rule read" when it's the
// deterministic fallback (so it's never blank and never misleading).
export default function AiRead({ text, source = "llm" }) {
  if (!text) return null;
  const ai = source === "llm";
  return (
    <div className={`airead${ai ? "" : " airead-rule"}`}>
      <span className="airead-tag">{ai ? "AI read" : "Rule read"}</span>
      <span className="airead-text">{text}</span>
    </div>
  );
}
