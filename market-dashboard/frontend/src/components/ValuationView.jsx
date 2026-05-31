import React from "react";
import { num } from "../format.js";
import AiRead from "./AiRead.jsx";

const VAL_LABELS = [["Trailing P/E", "pe"], ["Forward P/E", "fwd_pe"], ["P/E FY28", "fwd_pe_2028"], ["P/B", "pb"], ["P/S", "ps"], ["EV/EBITDA", "ev_ebitda"]];
const QUAL_LABELS = [["Gross margin", "gross_margin", "%"], ["Op margin", "op_margin", "%"], ["FCF / Net income", "fcf_ni", "x"]];

function val(v, unit) {
  if (v == null) return <span className="muted">n/m</span>;
  if (unit === "%") return <>{num(v, 1)}%</>;
  if (unit === "x") return <>{num(v, 2)}×</>;
  return <>{num(v, 1)}</>;
}

function Medians({ medians, labels }) {
  return (
    <div className="val-medians">
      {labels.map(([label, k, unit]) => (
        <div className="vstat" key={k}>
          <span className="vstat-v">{val(medians[k], unit)}</span>
          <span className="vstat-l">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ValuationView({ valuation, aiSource = "llm" }) {
  if (!valuation) {
    return <div className="banner info">Valuation data needs the <code>FMP_API_KEY</code> secret. It fills in on the next refresh.</div>;
  }
  return (
    <>
      <section className="card">
        <span className="hero-eyebrow">Tech + Semiconductors — median valuation (trailing & forward) + earnings quality</span>
        <Medians medians={valuation.overall_medians} labels={VAL_LABELS} />
        <div className="val-divider" />
        <Medians medians={valuation.overall_medians} labels={QUAL_LABELS} />
      </section>

      <AiRead text={valuation.analysis} source={aiSource} />

      {valuation.groups.map((g) => (
        <section className="card" key={g.name}>
          <h3 className="val-h">{g.name} <span className="cnt">group median</span></h3>
          <Medians medians={g.medians} labels={VAL_LABELS} />
          <div className="semis-table-wrap">
            <table className="semis-table">
              <thead>
                <tr>
                  <th className="l">Company</th><th>P/E</th><th>Fwd P/E</th><th>FY28 P/E</th>
                  <th>P/B</th><th>P/S</th><th>EV/EBITDA</th>
                  <th>Gross %</th><th>Op %</th><th>FCF/NI</th><th>SBC %OCF</th>
                </tr>
              </thead>
              <tbody>
                {g.companies.map((c) => (
                  <tr key={c.symbol}>
                    <td className="l">
                      <span className="sym">{c.symbol}</span>
                      <span className="cname">{c.name}</span>
                    </td>
                    <td>{val(c.pe)}</td><td>{val(c.fwd_pe)}</td><td>{val(c.fwd_pe_2028)}</td>
                    <td>{val(c.pb)}</td><td>{val(c.ps)}</td><td>{val(c.ev_ebitda)}</td>
                    <td>{val(c.gross_margin, "%")}</td><td>{val(c.op_margin, "%")}</td>
                    <td className={c.fcf_ni != null && c.fcf_ni < 0.7 ? "neg" : ""}>{val(c.fcf_ni, "x")}</td>
                    <td className={c.sbc_ocf != null && c.sbc_ocf > 25 ? "neg" : ""}>{val(c.sbc_ocf, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="foot muted">
        Multiples from FMP (ratios-ttm / key-metrics-ttm); forward P/E = price ÷ next-FY consensus EPS.
        Earnings quality: <b>FCF/NI</b> &lt; 0.7× and <b>SBC %OCF</b> &gt; 25% (red) flag earnings not backed by cash
        ("CFO illusions"). "n/m" = not meaningful. Informational only, not advice.
      </p>
    </>
  );
}
