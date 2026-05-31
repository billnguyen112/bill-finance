import React from "react";

// Highlighted inline AI commentary block, used under every section/chart/table.
export default function AiRead({ text }) {
  if (!text) return null;
  return (
    <div className="airead">
      <span className="airead-tag">AI read</span>
      <span className="airead-text">{text}</span>
    </div>
  );
}
