import { useState } from "react";
import { Sparkles, Plus, Share2, Check, X } from "lucide-react";

type Card = {
  id: string;
  tag: string;
  tagColor: string;
  title: string;
  desc: string;
  updated: string;
  status: "Actief" | "In review" | "Concept";
};

const statusColor = {
  Actief: "#2E9B74",
  "In review": "#F2A33C",
  Concept: "#9CA3AF",
};

const cards: Card[] = [
  {
    id: "p1",
    tag: "Energie",
    tagColor: "#F2A33C",
    title: "Datacenter Zoeterwoude",
    desc: "Locatieafweging voor een hyperscale-datacenter en de gevolgen voor energie en water.",
    updated: "Bijgewerkt 2 jun 2026",
    status: "Actief",
  },
  {
    id: "p2",
    tag: "Ruimte",
    tagColor: "#4191C2",
    title: "Woningbouw Gouda-Oost",
    desc: "Verdichtingsscenario's voor 4.500 nieuwe woningen langs de A12-corridor.",
    updated: "Bijgewerkt 28 mei 2026",
    status: "In review",
  },
  {
    id: "p3",
    tag: "Energie",
    tagColor: "#F2A33C",
    title: "Energietransitie Rijnmond",
    desc: "Combinatiescenario's voor wind op land, warmtenetten en industrieverduurzaming.",
    updated: "Bijgewerkt 24 mei 2026",
    status: "Actief",
  },
];

type Colleague = { name: string; role: string; initials: string };
const colleagues: Colleague[] = [
  { name: "Marleen Visser", role: "Beleidsadviseur", initials: "MV" },
  { name: "Daan Hofman", role: "Programmamanager Energie", initials: "DH" },
  { name: "Priya Nair", role: "Wateradviseur HHRijnland", initials: "PN" },
  { name: "Joris Bakker", role: "Netstrateeg TenneT", initials: "JB" },
  { name: "Sanne de Wit", role: "Ruimtelijk planner", initials: "SW" },
];

function ProjectCard({ card: c, onSelect }: { card: Card; onSelect: (id: string) => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shared, setShared] = useState<string[]>([]);
  const toggle = (name: string) =>
    setShared((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  return (
    <div
      onClick={() => onSelect(c.id)}
      className="relative text-left p-4 rounded-xl bg-white transition-colors hover:border-[#2B5E80] cursor-pointer"
      style={{ border: "0.5px solid #E4E7EC" }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="px-2 py-0.5 rounded"
          style={{ fontSize: 10.5, color: c.tagColor, backgroundColor: `${c.tagColor}14`, border: `0.5px solid ${c.tagColor}33` }}
        >
          {c.tag}
        </span>
        <div className="flex items-center gap-1.5">
          {shared.length > 0 && (
            <div className="flex items-center" style={{ marginRight: 2 }}>
              {shared.slice(0, 3).map((name, i) => {
                const col = colleagues.find((x) => x.name === name)!;
                return (
                  <span
                    key={name}
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 18, height: 18, fontSize: 8.5, color: "#fff", backgroundColor: "#2E9B74",
                      border: "1.5px solid #fff", marginLeft: i === 0 ? 0 : -6,
                    }}
                  >
                    {col.initials}
                  </span>
                );
              })}
              {shared.length > 3 && (
                <span style={{ fontSize: 10, color: "#98A2B3", marginLeft: 2 }}>+{shared.length - 3}</span>
              )}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShareOpen((o) => !o); }}
            className="flex items-center justify-center rounded-md transition-colors hover:bg-[#E9F2F8]"
            style={{ width: 24, height: 24, color: shareOpen ? "#2B5E80" : "#98A2B3", backgroundColor: shareOpen ? "#E9F2F8" : "transparent" }}
            aria-label="Deel project"
            title="Deel met collega's"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 13, color: "#101828", fontWeight: 500 }}>{c.title}</div>
      <p style={{ fontSize: 12, color: "#667085", marginTop: 6, lineHeight: 1.45 }}>{c.desc}</p>
      <div className="mt-4 flex items-center justify-between">
        <span style={{ fontSize: 11, color: "#98A2B3" }}>{c.updated}</span>
        <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: "#475467" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: statusColor[c.status] }} />
          {c.status}
        </span>
      </div>

      {shareOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-20 rounded-xl bg-white"
          style={{ top: 40, right: 12, width: 256, border: "0.5px solid #E4E7EC", boxShadow: "0 8px 24px rgba(16,24,40,0.12)" }}
        >
          <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: "0.5px solid #E4E7EC" }}>
            <span style={{ fontSize: 12, color: "#101828", fontWeight: 500 }}>Deel met collega's</span>
            <button onClick={() => setShareOpen(false)} style={{ color: "#98A2B3" }}><X size={13} /></button>
          </div>
          <div className="py-1.5 max-h-56 overflow-y-auto">
            {colleagues.map((col) => {
              const on = shared.includes(col.name);
              return (
                <button
                  key={col.name}
                  onClick={() => toggle(col.name)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-[#F7F8FA]"
                >
                  <span className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, fontSize: 10, color: "#fff", backgroundColor: "#2B5E80" }}>
                    {col.initials}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 12, color: "#101828" }}>{col.name}</span>
                    <span className="block truncate" style={{ fontSize: 10.5, color: "#98A2B3" }}>{col.role}</span>
                  </span>
                  <span
                    className="flex items-center justify-center rounded"
                    style={{ width: 18, height: 18, border: on ? "none" : "1px solid #D0D5DD", backgroundColor: on ? "#2E9B74" : "transparent" }}
                  >
                    {on && <Check size={12} color="#fff" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="px-3.5 py-2.5" style={{ borderTop: "0.5px solid #E4E7EC" }}>
            <span style={{ fontSize: 11, color: "#667085" }}>
              {shared.length === 0 ? "Nog niet gedeeld" : `Gedeeld met ${shared.length} collega${shared.length === 1 ? "" : "'s"}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function HomeScreen({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  return (
    <div className="px-10 py-8 max-w-[1180px]">
      <div className="mb-7">
        <h1 style={{ fontSize: 22, color: "#101828", fontWeight: 500 }}>
          Scenario planning voor beleid
        </h1>
        <p style={{ fontSize: 13, color: "#475467", marginTop: 6, maxWidth: 640 }}>
          Start een nieuw beleidsvraagstuk of werk verder aan een lopend project.
          ScenarioLab helpt u variabelen, onbekenden en scenario's gestructureerd in beeld te brengen.
        </p>
      </div>

      <button
        onClick={onNew}
        className="w-full flex items-center gap-3 px-5 py-5 rounded-xl text-left bg-white transition-colors hover:border-[#2B5E80]"
        style={{
          border: "1.5px dashed #CBD5E1",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#E9F2F8", color: "#2B5E80" }}
        >
          <Sparkles size={17} />
        </div>
        <div className="flex flex-col">
          <span style={{ fontSize: 13.5, color: "#101828" }}>
            <Plus size={12} className="inline mr-1 -mt-0.5" />
            Start een nieuw project
          </span>
          <span style={{ fontSize: 12, color: "#667085", marginTop: 2 }}>
            Beschrijf uw beleidsvraagstuk — de assistent helpt context, variabelen en scenario's op te zetten.
          </span>
        </div>
      </button>

      <div className="mt-9 mb-3 flex items-center justify-between">
        <h2 style={{ fontSize: 14, color: "#101828" }}>Recente projecten</h2>
        <span style={{ fontSize: 11.5, color: "#667085" }}>{cards.length} projecten</span>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        {cards.map((c) => (
          <ProjectCard key={c.id} card={c} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
