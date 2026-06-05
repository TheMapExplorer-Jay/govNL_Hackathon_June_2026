import { ChevronRight, Download, Sparkles } from "lucide-react";

type Props = {
  crumbs: string[];
  actions?: "project" | "dashboard" | "none";
};

export function TopBar({ crumbs, actions = "none" }: Props) {
  return (
    <div
      className="flex items-center justify-between px-6 bg-white"
      style={{ height: 52, borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}
    >
      <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#475467" }}>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span style={{ color: i === crumbs.length - 1 ? "#2B5E80" : "#667085" }}>{c}</span>
            {i < crumbs.length - 1 && <ChevronRight size={12} color="#98A2B3" />}
          </span>
        ))}
      </div>

      {actions === "project" && (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white"
            style={{ fontSize: 12, border: "0.5px solid #D0D5DD", color: "#2B5E80" }}
          >
            <Download size={12} />
            Exporteer
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white"
            style={{ fontSize: 12, backgroundColor: "#2B5E80" }}
          >
            <Sparkles size={12} />
            Aanvullen met AI
          </button>
        </div>
      )}
      {actions === "dashboard" && (
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white"
            style={{ fontSize: 12, border: "0.5px solid #D0D5DD", color: "#2B5E80" }}
          >
            <Download size={12} />
            Exporteer scenario's
          </button>
        </div>
      )}
    </div>
  );
}
