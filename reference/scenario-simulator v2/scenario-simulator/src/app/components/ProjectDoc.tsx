import { useState } from "react";
import { FileText, Calendar, User, Clock } from "lucide-react";

type DocSection = "probleem" | "locatie" | "stake" | "open" | "vast" | "geblok" | "docs";

const navGroups: { title: string; items: { key: DocSection; label: string; dot?: string }[] }[] = [
  {
    title: "Context",
    items: [
      { key: "probleem", label: "Probleemstelling" },
      { key: "locatie", label: "Locatiecontext" },
      { key: "stake", label: "Stakeholders" },
    ],
  },
  {
    title: "Beslispunten",
    items: [
      { key: "open", label: "Open", dot: "#F2A33C" },
      { key: "vast", label: "Vastgesteld", dot: "#2E9B74" },
      { key: "geblok", label: "Geblokkeerd", dot: "#E5544B" },
    ],
  },
  {
    title: "Documenten",
    items: [{ key: "docs", label: "Gekoppelde bestanden" }],
  },
];

type DecisionStatus = "Open" | "Vastgesteld" | "Geblokkeerd";
const statusStyle: Record<DecisionStatus, { fg: string; bg: string; bd: string }> = {
  Open: { fg: "#B07211", bg: "#FDF1DE", bd: "#F5D29A" },
  Vastgesteld: { fg: "#2E9B74", bg: "#E4F2EB", bd: "#B7DAC8" },
  Geblokkeerd: { fg: "#E5544B", bg: "#FBE5E2", bd: "#F1B6AE" },
};

type Decision = { title: string; status: DecisionStatus; desc: string };

const initialDecisions: Decision[] = [
  {
    title: "Locatiekeuze datacenter",
    status: "Open",
    desc: "Drie locaties in beeld langs de A4-corridor. Voorkeur hangt af van beschikbare aansluitcapaciteit op het hoogspanningsnet.",
  },
  {
    title: "Maximale onttrekking koelwater",
    status: "Open",
    desc: "Waterschap vraagt onderbouwing voor onttrekkingsplafond onder droogtescenario WH-2050.",
  },
  {
    title: "Aansluiting op warmtenet Leiden",
    status: "Vastgesteld",
    desc: "Bestuurlijk besluit 14 mei 2026: restwarmte wordt verplicht aangeboden aan het regionale warmtenet.",
  },
  {
    title: "Compensatie groen-blauwe structuur",
    status: "Geblokkeerd",
    desc: "Afhankelijk van NPLG-besluit in Q3 2026. Compensatieratio nog onbekend.",
  },
];

const variables = [
  { name: "Omvang datacenter", type: "keuze", value: "20 – 120 MW", source: "Initiatiefnemer" },
  { name: "Klimaatscenario", type: "gegeven", value: "KNMI'23 Wₕ", source: "KNMI" },
  { name: "Grondwaterpeil", type: "gegeven", value: "−75 cm NAP", source: "HHRijnland" },
  { name: "Werkgelegenheid", type: "berekend", value: "+85 tot +620 FTE", source: "Model PZH-Econ v2" },
  { name: "Waterverbruik", type: "keuze", value: "1 – 12 Mm³/jr", source: "Initiatiefnemer" },
];

const typeColor: Record<string, { fg: string; bg: string }> = {
  keuze: { fg: "#B07211", bg: "#FDF1DE" },
  gegeven: { fg: "#2C6489", bg: "#E4F0F8" },
  berekend: { fg: "#2E9B74", bg: "#E4F2EB" },
};

export function ProjectDoc() {
  const [active, setActive] = useState<DocSection>("probleem");
  const [decisions, setDecisions] = useState(initialDecisions);

  const cycle: Record<DecisionStatus, DecisionStatus> = {
    Open: "Vastgesteld",
    Vastgesteld: "Geblokkeerd",
    Geblokkeerd: "Open",
  };

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 52px)" }}>
      <aside
        className="px-3 py-5"
        style={{ width: 220, backgroundColor: "#F7F8FA", borderRight: "0.5px solid #E4E7EC" }}
      >
        {navGroups.map((g) => (
          <div key={g.title} className="mb-5">
            <div
              className="px-2 mb-1.5"
              style={{ fontSize: 10, letterSpacing: 0.6, color: "#98A2B3", textTransform: "uppercase" }}
            >
              {g.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <button
                  key={it.key}
                  onClick={() => setActive(it.key)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left"
                  style={{
                    fontSize: 12,
                    color: active === it.key ? "#2B5E80" : "#475467",
                    backgroundColor: active === it.key ? "#E9F2F8" : "transparent",
                  }}
                >
                  {it.dot && (
                    <span
                      style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: it.dot }}
                    />
                  )}
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <main className="flex-1 px-10 py-8 overflow-y-auto" style={{ maxWidth: 980 }}>
        <header className="mb-7">
          <div style={{ fontSize: 11.5, color: "#667085" }}>Project</div>
          <h2 style={{ fontSize: 22, color: "#101828", marginTop: 2 }}>Datacenter Zoeterwoude</h2>
          <p style={{ fontSize: 13, color: "#475467", marginTop: 6, maxWidth: 680 }}>
            Verkenning van locatie-, omvang- en milieuvarianten voor een hyperscale-datacenter
            ten zuiden van Zoeterwoude-Dorp.
          </p>
          <div className="flex items-center gap-4 mt-4" style={{ fontSize: 11.5, color: "#667085" }}>
            <span className="flex items-center gap-1.5"><Calendar size={11} /> Gestart 12 apr 2026</span>
            <span className="flex items-center gap-1.5"><User size={11} /> Marleen Visser</span>
            <span className="flex items-center gap-1.5"><Clock size={11} /> Bijgewerkt 2 jun 2026</span>
          </div>
        </header>

        <Section title="Probleemstelling">
          <p style={{ fontSize: 13, color: "#344054", lineHeight: 1.65 }}>
            De provincie Zuid-Holland heeft een aanvraag ontvangen voor de vestiging van een
            grootschalig datacenter in het buitengebied tussen Zoeterwoude en Hazerswoude. De vraag
            is hoe een dergelijke ontwikkeling zich verhoudt tot bestaande opgaven rond
            woningbouw, water, energie-infrastructuur en landschappelijke kwaliteit.
          </p>
          <p style={{ fontSize: 13, color: "#344054", lineHeight: 1.65, marginTop: 10 }}>
            Doel van dit scenario-onderzoek is om de bestuurlijke afwegingen te onderbouwen met
            een gestructureerde vergelijking van drie omvangvarianten (20, 60 en 120 MW) onder
            twee klimaatscenario's. De scenario's worden iteratief verfijnd in samenwerking
            met het waterschap, TenneT en de gemeenten Zoeterwoude en Alphen aan den Rijn.
          </p>
        </Section>

        <Section title="Openstaande beslissingen">
          <div className="grid grid-cols-2 gap-3">
            {decisions.map((d, idx) => {
              const st = statusStyle[d.status];
              return (
                <div
                  key={d.title}
                  className="rounded-lg p-3.5"
                  style={{ backgroundColor: "#F7F8FA", border: "0.5px solid #E4E7EC" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div style={{ fontSize: 12.5, color: "#101828", fontWeight: 500 }}>{d.title}</div>
                    <button
                      onClick={() => {
                        const next = [...decisions];
                        next[idx] = { ...d, status: cycle[d.status] };
                        setDecisions(next);
                      }}
                      className="px-2 py-0.5 rounded shrink-0"
                      style={{
                        fontSize: 10.5,
                        color: st.fg,
                        backgroundColor: st.bg,
                        border: `0.5px solid ${st.bd}`,
                      }}
                    >
                      {d.status}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: "#475467", marginTop: 6, lineHeight: 1.5 }}>
                    {d.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Kernvariabelen">
          <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid #E4E7EC" }}>
            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ backgroundColor: "#F7F8FA" }}>
                <tr>
                  <Th>Variabele</Th>
                  <Th>Type</Th>
                  <Th>Waarde / bandbreedte</Th>
                  <Th>Bron</Th>
                </tr>
              </thead>
              <tbody>
                {variables.map((v, i) => {
                  const c = typeColor[v.type];
                  return (
                    <tr key={v.name} style={{ borderTop: "0.5px solid #E4E7EC" }}>
                      <td className="px-3 py-2.5" style={{ color: "#101828" }}>{v.name}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className="px-2 py-0.5 rounded"
                          style={{ fontSize: 10.5, color: c.fg, backgroundColor: c.bg }}
                        >
                          {v.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" style={{ color: "#344054" }}>{v.value}</td>
                      <td className="px-3 py-2.5" style={{ color: "#667085" }}>{v.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Gekoppelde documenten">
          <div className="flex flex-col gap-1.5">
            {[
              "Locatieonderzoek Zoeterwoude-Zuid (PDF)",
              "Netimpactanalyse TenneT — concept v0.4",
              "Bestuurlijk besluit warmtenet Leiden 14-05-2026",
            ].map((d) => (
              <a
                key={d}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-white"
                style={{ fontSize: 12, color: "#2C6489", border: "0.5px solid #E4E7EC" }}
                href="#"
              >
                <FileText size={13} />
                {d}
              </a>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left px-3 py-2.5"
      style={{ fontSize: 11, color: "#667085", fontWeight: 500 }}
    >
      {children}
    </th>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 style={{ fontSize: 13.5, color: "#101828", marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  );
}
