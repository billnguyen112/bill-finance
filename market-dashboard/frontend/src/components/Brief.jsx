import React from "react";

// An MD-grade brief written by Claude from the transcript. Renders only the
// sections that are present; everything is optional so a partial brief is fine.
const STANCE_CLASS = {
  bullish: "stance-bull",
  "cautiously bullish": "stance-bull",
  neutral: "stance-neutral",
  cautious: "stance-bear",
  bearish: "stance-bear",
};

function List({ label, items }) {
  if (!items || !items.length) return null;
  return (
    <div className="brief-block">
      <div className="brief-label">{label}</div>
      <ul className="brief-list">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

export default function Brief({ brief }) {
  if (!brief || !brief.thesis) return null;
  const stance = (brief.stance || "").toLowerCase();
  return (
    <div className="brief">
      <div className="brief-thesis">
        {brief.stance && (
          <span className={`brief-stance ${STANCE_CLASS[stance] || "stance-neutral"}`}>
            {brief.stance}
          </span>
        )}
        <p>{brief.thesis}</p>
      </div>
      <List label="Key points" items={brief.key_points} />
      <List label="Data points" items={brief.data_points} />
      <List label="Risks he flagged" items={brief.risks} />
      <List label="Positioning" items={brief.positioning} />
    </div>
  );
}
