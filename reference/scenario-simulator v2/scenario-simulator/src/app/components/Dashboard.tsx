import { useRef, useState, Fragment } from "react";
import {
  Send, ArrowUpRight, Sparkles, Lock, AlertTriangle, MessageSquare,
  Plus, Trash2, Pencil, CircleCheck, Lightbulb, ClipboardList, Calculator,
  Check, Upload, Link2, FileText, Download, Share2, ArrowLeft, ArrowRight, Map as MapIcon,
  Info, X,
} from "lucide-react";

type VarType = "keuze" | "gegeven";
type Importance = "Hoog" | "Middel" | "Laag";

type Variable = {
  key: string; label: string; unit: string; type: VarType;
  min: number; max: number; value: number; step?: number;
  importance: Importance; role: string; rationale: string; source: string;
};

const initialVars: Variable[] = [
  { key: "klim", label: "Klimaatscenario KNMI'23", unit: "Wₕ-niveau", type: "gegeven", min: 1, max: 4, value: 3, importance: "Hoog", role: "contextvariabele", rationale: "Stuurt water- en droogtedruk; kritisch onder Wₕ.", source: "KNMI'23" },
  { key: "net", label: "Netcongestie station", unit: "% belast", type: "gegeven", min: 40, max: 100, value: 75, importance: "Hoog", role: "contextvariabele", rationale: "Beperkte stationcapaciteit kan de grote varianten onaansluitbaar maken.", source: "Netimpactanalyse TenneT" },
  { key: "inw", label: "Inwoners in impactzone", unit: "x1000", type: "gegeven", min: 10, max: 120, value: 42, importance: "Middel", role: "contextvariabele", rationale: "Schaalt woningmarkt- en verkeerseffecten.", source: "CBS / PZH" },
  { key: "wat", label: "Koelwaterverbruik (bij 60 MW)", unit: "Mm³/jr", type: "keuze", min: 1, max: 12, value: 4, importance: "Middel", role: "contextvariabele", rationale: "Direct gekoppeld aan koeling en vergunningsplafond.", source: "Initiatiefnemer" },
  { key: "gw", label: "Grondwaterpeil", unit: "cm NAP", type: "gegeven", min: -120, max: -20, value: -75, importance: "Laag", role: "contextvariabele", rationale: "Randvoorwaarde; weegt licht mee in waterbalans.", source: "HHRijnland" },
  { key: "verk", label: "Bevolkingsgroei omgeving", unit: "%/jr", type: "gegeven", min: 0, max: 4, value: 2, step: 1, importance: "Laag", role: "contextvariabele", rationale: "Tweede-orde effect t.o.v. omvang en net.", source: "CBS Prognose" },
];

type Ctx = { klim: number; net: number; inw: number; wat: number; gw: number; verk: number };
function ctxFrom(vars: Variable[]): Ctx {
  const get = (k: string, d: number) => vars.find((v) => v.key === k)?.value ?? d;
  return { klim: get("klim", 3), net: get("net", 75), inw: get("inw", 42), wat: get("wat", 4), gw: get("gw", -75), verk: get("verk", 2) };
}

type Scenario = { id: string; name: string; mw: number; color: string; rationale: string };
const scenarioColors = ["#2E9B74", "#F2A33C", "#4191C2", "#7C3AED", "#E5544B", "#2C6489"];
const initialScenarios: Scenario[] = [
  { id: "sc-mid", name: "Middel", mw: 60, color: "#2E9B74", rationale: "Realistische middenvariant: balans tussen maatschappelijke opbrengst en systeemdruk." },
  { id: "sc-grt", name: "Groot", mw: 120, color: "#F2A33C", rationale: "Bovengrensvariant om de maximale impact en aansluitbaarheid te verkennen." },
];

type CalcRow = { key: string; metric: string; unit: string; formula: string; source: string; values: number[] };
function computeCalc(ctx: Ctx, scenarios: Scenario[]): CalcRow[] {
  const mws = scenarios.map((s) => s.mw);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return [
    { key: "energie", metric: "Energievraag", unit: "MW", formula: "= datacenteromvang (scenario-as)", source: "Aanvraag initiatiefnemer", values: mws },
    { key: "ruimte", metric: "Ruimtebeslag", unit: "ha", formula: "= omvang × 0,12 ha/MW", source: "Kengetal PZH-Ruimte v2", values: mws.map((mw) => r1(mw * 0.12)) },
    { key: "water", metric: "Koelwaterverbruik", unit: "Mm³/jr", formula: "= (omvang / 60) × basis × klimaatcorr. (1 + 0,08·(KNMI−1))", source: "Opgave initiatiefnemer + KNMI'23", values: mws.map((mw) => r2((mw / 60) * ctx.wat * (1 + 0.08 * (ctx.klim - 1)))) },
    { key: "fte", metric: "Werkgelegenheid", unit: "FTE", formula: "= omvang × 5,2 FTE/MW", source: "Model PZH-Econ v2", values: mws.map((mw) => Math.round(mw * 5.2)) },
    { key: "warmte", metric: "Restwarmte-aanbod", unit: "woningequiv.", formula: "= omvang × 26 won-eq/MW", source: "Warmtenet Leiden, kental", values: mws.map((mw) => Math.round(mw * 26)) },
    { key: "net", metric: "Netbelasting station", unit: "%", formula: "= bestaande belasting + (omvang / 150) × (100 − belasting)", source: "Netimpactanalyse TenneT v0.4", values: mws.map((mw) => Math.round(ctx.net + (mw / 150) * (100 - ctx.net))) },
    { key: "woning", metric: "Druk woningmarkt", unit: "Δ%", formula: "= −(FTE / inwoners) × 1,4", source: "Model PZH-Econ v2", values: mws.map((mw) => r1(-((mw * 5.2) / (ctx.inw * 1000)) * 1.4 * 100)) },
  ];
}

const themes = [
  { key: "ruimte", label: "Ruimte" }, { key: "energie", label: "Energie" }, { key: "water", label: "Water" },
  { key: "economie", label: "Economie" }, { key: "woning", label: "Woningbouw" }, { key: "net", label: "Netcongestie" },
];
const themeHint: Record<string, string> = {
  ruimte: "Ruimtebeslag & landschappelijke inpassing",
  energie: "Energievraag & duurzame opwek",
  water: "Koelwater, droogte & grondwater",
  economie: "Werkgelegenheid & investeringen",
  woning: "Druk op de woningmarkt",
  net: "Aansluitbaarheid op het stroomnet",
};
const initialThemeWeights: Record<string, number> = { ruimte: 3, energie: 5, water: 5, economie: 4, woning: 3, net: 4 };
const weightLabels = ["", "Zeer laag", "Laag", "Gemiddeld", "Hoog", "Cruciaal"];
const weightColor = ["", "#98A2B3", "#2E9B74", "#4191C2", "#B07211", "#E5544B"];
type Impact = { dots?: number; label?: "laag" | "middel" | "hoog"; value?: string; attention?: string };
function buildMatrix(calc: CalcRow[]): Record<string, Impact[]> {
  const row = (k: string) => calc.find((c) => c.key === k)!;
  const dotsFor = (v: number, max: number) => Math.max(1, Math.min(5, Math.round((v / max) * 5)));
  const waterLabel = (v: number): "laag" | "middel" | "hoog" => (v < 3 ? "laag" : v < 7 ? "middel" : "hoog");
  const netLabel = (v: number): "laag" | "middel" | "hoog" => (v < 80 ? "laag" : v < 95 ? "middel" : "hoog");
  return {
    ruimte: row("ruimte").values.map((v) => ({ dots: dotsFor(v, 15), attention: v >= 12 ? "Fors ruimtebeslag (>12 ha)" : undefined })),
    energie: row("energie").values.map((v) => ({ value: `+${v} MW`, attention: v >= 100 ? "Sterke energievraagstijging (≥100 MW)" : undefined })),
    water: row("water").values.map((v) => ({ label: waterLabel(v), attention: v >= 7 ? "Hoog koelwaterverbruik onder droogtescenario" : undefined })),
    economie: row("fte").values.map((v) => ({ value: `+${v} FTE` })),
    woning: row("woning").values.map((v) => ({ value: `${v}%`, attention: v <= -8 ? "Substantiële druk op de woningmarkt" : undefined })),
    net: row("net").values.map((v) => ({ label: netLabel(v), attention: v >= 95 ? "Net vrijwel vol — uitbreiding noodzakelijk" : undefined })),
  };
}

const labelColor = { laag: "#2E9B74", middel: "#F2A33C", hoog: "#E5544B" };
const impStyle: Record<Importance, { fg: string; bg: string }> = {
  Hoog: { fg: "#E5544B", bg: "#FBE5E2" }, Middel: { fg: "#B07211", bg: "#FDF1DE" }, Laag: { fg: "#2E9B74", bg: "#E4F2EB" },
};
const typeColor: Record<string, { fg: string; bg: string }> = {
  keuze: { fg: "#B07211", bg: "#FDF1DE" }, gegeven: { fg: "#2C6489", bg: "#E4F0F8" },
};

type ContextItem = { id: string; label: string; value: string };
type DecisionStatus = "Open" | "Vastgesteld" | "Geblokkeerd";
type Decision = { id: string; title: string; status: DecisionStatus; desc: string };

const initialFlow1: ContextItem[] = [
  { id: "f1a", label: "Omvang & fasering", value: "Hyperscale, gefaseerd 20 → 120 MW (scenario-as S1–S3)" },
  { id: "f1b", label: "Energie-efficiëntie", value: "Ontwerp-PUE 1,2; restwarmte beschikbaar voor warmtenet" },
  { id: "f1c", label: "Koeling & water", value: "Adiabatische koeling, ~4 Mm³/jr bij 60 MW" },
  { id: "f1d", label: "Werkgelegenheid", value: "80–120 vaste medewerkers + onderhoud" },
  { id: "f1e", label: "Infrastructuur", value: "Nieuwe glasvezelring + verbreding ontsluitingsweg" },
];
const initialFlow2: ContextItem[] = [
  { id: "f2a", label: "Klimaatscenario", value: "KNMI'23 Wₕ — warm en hoog (kritisch pad voor water)" },
  { id: "f2b", label: "Bevolking omgeving", value: "42k inwoners in impactzone, ~+2%/jr groei" },
  { id: "f2c", label: "Netcongestie", value: "Station ~75% belast, beperkte uitbreidingsruimte" },
  { id: "f2d", label: "Grondwaterpeil", value: "−75 cm NAP (HHRijnland)" },
];
const initialDecisions: Decision[] = [
  { id: "d1", title: "Locatiekeuze datacenter", status: "Open", desc: "Drie locaties langs de A4-corridor; voorkeur hangt af van aansluitcapaciteit." },
  { id: "d2", title: "Maximale koelwateronttrekking", status: "Open", desc: "Waterschap vraagt onderbouwing onder droogtescenario Wₕ." },
  { id: "d3", title: "Aansluiting warmtenet Leiden", status: "Vastgesteld", desc: "Bestuurlijk besluit 14 mei 2026: restwarmte verplicht aangeboden." },
  { id: "d4", title: "Compensatie groen-blauwe structuur", status: "Geblokkeerd", desc: "Afhankelijk van NPLG-besluit Q3 2026." },
];
const decStatusStyle: Record<DecisionStatus, { fg: string; bg: string; bd: string }> = {
  Open: { fg: "#B07211", bg: "#FDF1DE", bd: "#F5D29A" },
  Vastgesteld: { fg: "#2E9B74", bg: "#E4F2EB", bd: "#B7DAC8" },
  Geblokkeerd: { fg: "#E5544B", bg: "#FBE5E2", bd: "#F1B6AE" },
};
const decisionCycle: Record<DecisionStatus, DecisionStatus> = { Open: "Vastgesteld", Vastgesteld: "Geblokkeerd", Geblokkeerd: "Open" };
const uid = () => Math.random().toString(36).slice(2, 9);

type ChatMsg = { role: "ai" | "user"; text: string; suggestions?: string[]; flow?: string };

// Step 1: only a welcome and 3 starter prompts to gather context.
const intakeConversation: ChatMsg[] = [
  {
    role: "ai",
    text:
      "Welkom. Ik help u de context van dit beleidsvraagstuk in kaart te brengen. Vertel me over het initiatief, dan stel ik gerichte vervolgvragen. Waar wilt u mee beginnen?",
    suggestions: [
      "Beschrijf het datacenter zelf — omvang, koeling en werkgelegenheid",
      "Benoem de omgevingsfactoren — klimaat, netcongestie en bewoners",
      "Welke beslispunten en onzekerheden spelen er?",
    ],
  },
];

// Step 2+: the assistant is filled with a richer recap of the gathered context.
const contextConversation: ChatMsg[] = [
  { role: "ai", flow: "Flow 1 · Het datacenter zelf", text: "Op basis van ons gesprek heb ik de context samengevat. Het gaat om een hyperscale-datacenter, gefaseerd van 20 tot 120 MW, met een ontwerp-PUE van 1,2 en beschikbare restwarmte voor het warmtenet." },
  { role: "ai", text: "De koeling is adiabatisch met circa 4 Mm³ koelwater per jaar bij 60 MW. Er werken straks 80–120 mensen, en er zijn een nieuwe glasvezelring én verbreding van de ontsluitingsweg nodig." },
  { role: "ai", flow: "Flow 2 · Externe factoren", text: "Voor de omgeving rekenen we met klimaatscenario KNMI'23 Wₕ (warm, hoog) — het kritische pad voor water. In de impactzone wonen circa 42.000 mensen, met ongeveer +2% groei per jaar." },
  { role: "ai", text: "Het hoogspanningsstation is al ~75% belast met beperkte uitbreidingsruimte; dat bepaalt of de grotere varianten aansluitbaar zijn. Klimaat en netcongestie wegen daarom het zwaarst in de afweging." },
  { role: "ai", text: "Stel hier het belang van de thema's bij of pas de scenario's aan. Wat wilt u verkennen?", suggestions: ["Waarom weegt water zo zwaar?", "Voeg een voorzichtig scenario toe", "Vat de grootste risico's samen"] },
];

const colleagues = [
  { name: "Marleen Visser", role: "Beleidsadviseur", initials: "MV" },
  { name: "Daan Hofman", role: "Programmamanager Energie", initials: "DH" },
  { name: "Priya Nair", role: "Wateradviseur HHRijnland", initials: "PN" },
  { name: "Joris Bakker", role: "Netstrateeg TenneT", initials: "JB" },
  { name: "Sanne de Wit", role: "Ruimtelijk planner", initials: "SW" },
];

const stepLabels = ["Invoer & context", "Variabelen", "Scenario's", "Delen & bespreken"];

// =============================================================================

export function ProjectFlow({ initialStep = 1, isNew = false, onExit }: { initialStep?: number; isNew?: boolean; onExit?: () => void }) {
  const [step, setStep] = useState(initialStep);
  const [vars, setVars] = useState<Variable[]>(initialVars);
  const [flow1, setFlow1] = useState<ContextItem[]>(initialFlow1);
  const [flow2, setFlow2] = useState<ContextItem[]>(initialFlow2);
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [intakeMsgs, setIntakeMsgs] = useState<ChatMsg[]>(intakeConversation);
  const [contextMsgs, setContextMsgs] = useState<ChatMsg[]>(contextConversation);
  const [themeWeights, setThemeWeights] = useState<Record<string, number>>(initialThemeWeights);
  const [infoOpen, setInfoOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  // step 1 intake
  const [question, setQuestion] = useState(isNew ? "" : "Hoe wegen we de vestiging van een hyperscale-datacenter af tegen woningbouw, water en energie-infrastructuur in de A4-corridor bij Zoeterwoude?");
  const [files, setFiles] = useState<string[]>(isNew ? [] : ["Locatieonderzoek Zoeterwoude-Zuid.pdf"]);
  const [links, setLinks] = useState<string[]>([]);

  const ctx = ctxFrom(vars);
  const calc = computeCalc(ctx, scenarios);
  const matrix = buildMatrix(calc);

  const messages = step === 1 ? intakeMsgs : contextMsgs;
  const onSend = (text: string) => {
    const append = (m: ChatMsg[]): ChatMsg[] => [...m, { role: "user", text }, { role: "ai", text: "Genoteerd. Ik verwerk dit in de context en herbereken de scenario's. U ziet de wijziging terug in de volgende stappen.", suggestions: ["Leg vast als uitgangspunt", "Maak gevoeligheidsvariant"] }];
    if (step === 1) setIntakeMsgs(append); else setContextMsgs(append);
  };

  const showChat = step !== 4;

  return (
    <div className="flex flex-col h-full min-h-0">
      <Stepper step={step} setStep={setStep} />
      <div className="flex flex-1 min-h-0" style={{ overflow: "hidden" }}>
        <div className="flex-1 min-w-0 flex flex-col" style={{ maxWidth: showChat ? "calc(100% - 360px)" : "100%" }}>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {step === 1 && <IntakeStep question={question} setQuestion={setQuestion} files={files} setFiles={setFiles} links={links} setLinks={setLinks} isNew={isNew} />}
            {step === 2 && <ThemeImportanceStep weights={themeWeights} setWeights={setThemeWeights} scenarios={scenarios} setScenarios={setScenarios} />}
            {step === 3 && <ScenarioStep ctx={ctx} calc={calc} matrix={matrix} scenarios={scenarios} question={question} onShowInfo={() => setInfoOpen(true)} onShowCalc={() => setCalcOpen(true)} />}
            {step === 4 && <ShareStep calc={calc} ctx={ctx} scenarios={scenarios} />}
          </div>
          <FlowFooter step={step} setStep={setStep} onExit={onExit} />
        </div>
        {showChat && <ChatPanel step={step} messages={messages} onSend={onSend} />}
      </div>
      {infoOpen && (
        <ContextInfoModal
          onClose={() => setInfoOpen(false)}
          flow1={flow1} setFlow1={setFlow1} flow2={flow2} setFlow2={setFlow2}
          decisions={decisions} setDecisions={setDecisions} vars={vars} setVars={setVars}
        />
      )}
      {calcOpen && <CalcModal onClose={() => setCalcOpen(false)} calc={calc} scenarios={scenarios} />}
    </div>
  );
}

// ---- Stepper ----------------------------------------------------------------

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <div className="bg-white px-8 py-4 shrink-0" style={{ borderBottom: "0.5px solid #E4E7EC" }}>
      <div className="flex items-start" style={{ maxWidth: 760, margin: "0 auto" }}>
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <Fragment key={n}>
              {i > 0 && <div style={{ flex: 1, height: 2, marginTop: 13, backgroundColor: n <= step ? "#2B5E80" : "#E4E7EC" }} />}
              <button onClick={() => setStep(n)} className="flex flex-col items-center" style={{ width: 130, cursor: "pointer" }}>
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 28, height: 28, fontSize: 12, fontWeight: 500,
                    backgroundColor: done ? "#2B5E80" : current ? "#fff" : "#fff",
                    color: done ? "#fff" : current ? "#2B5E80" : "#98A2B3",
                    border: current ? "2px solid #2B5E80" : done ? "none" : "1.5px solid #E4E7EC",
                  }}
                >
                  {done ? <Check size={15} /> : n}
                </span>
                <span style={{ marginTop: 7, fontSize: 12, textAlign: "center", color: current ? "#2B5E80" : done ? "#101828" : "#98A2B3", fontWeight: current ? 500 : 400 }}>{label}</span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function FlowFooter({ step, setStep, onExit }: { step: number; setStep: (n: number) => void; onExit?: () => void }) {
  return (
    <div className="shrink-0 flex items-center justify-between px-8 py-3 bg-white" style={{ borderTop: "0.5px solid #E4E7EC" }}>
      <button
        onClick={() => (step === 1 ? onExit?.() : setStep(step - 1))}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white"
        style={{ fontSize: 12, color: "#475467", border: "0.5px solid #D0D5DD" }}
      >
        <ArrowLeft size={13} /> {step === 1 ? "Terug naar overzicht" : "Vorige"}
      </button>
      <span style={{ fontSize: 11.5, color: "#98A2B3" }}>Stap {step} van 4 — {stepLabels[step - 1]}</span>
      {step < 4 ? (
        <button onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-white" style={{ fontSize: 12, backgroundColor: "#2B5E80" }}>
          Volgende <ArrowRight size={13} />
        </button>
      ) : (
        <button onClick={() => onExit?.()} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-white" style={{ fontSize: 12, backgroundColor: "#2E9B74" }}>
          <Check size={13} /> Afronden
        </button>
      )}
    </div>
  );
}

// ---- Step 1: Intake ---------------------------------------------------------

function IntakeStep({ question, setQuestion, files, setFiles, links, setLinks, isNew }: {
  question: string; setQuestion: (v: string) => void;
  files: string[]; setFiles: (v: string[]) => void;
  links: string[]; setLinks: (v: string[]) => void;
  isNew: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const addLink = () => { const v = linkUrl.trim(); if (!v) return; setLinks([...links, v]); setLinkUrl(""); };

  return (
    <div className="px-10 py-8 w-full" style={{ maxWidth: 820 }}>
      <h2 style={{ fontSize: 18, color: "#101828", fontWeight: 500 }}>Invoer & context</h2>
      <p style={{ fontSize: 12.5, color: "#667085", marginTop: 4, marginBottom: 24, maxWidth: 640 }}>
        Beschrijf het beleidsvraagstuk en voeg eventueel een bestaand beleidsstuk toe. De assistent rechts stelt
        gerichte vragen om samen de context en variabelen op te bouwen.
      </p>

      <section className="rounded-xl bg-white p-5 mb-5" style={{ border: "0.5px solid #E4E7EC" }}>
        <label style={{ fontSize: 12, color: "#101828", fontWeight: 500 }}>Beleidsvraagstuk</label>
        <textarea
          value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
          placeholder="Bijv.: Hoe wegen we de vestiging van een hyperscale-datacenter af tegen woningbouw, water en energie-infrastructuur in de A4-corridor?"
          className="w-full mt-2 px-3 py-2.5 rounded-md outline-none bg-white"
          style={{ fontSize: 12.5, color: "#101828", border: "0.5px solid #D0D5DD", resize: "vertical" }}
        />
      </section>

      <section className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E4E7EC" }}>
        <label style={{ fontSize: 12, color: "#101828", fontWeight: 500 }}>Bestaand beleidsstuk (optioneel)</label>
        <div style={{ fontSize: 11.5, color: "#98A2B3", marginTop: 2, marginBottom: 12 }}>
          Upload een document of koppel een link — de assistent gebruikt dit als startpunt voor context en variabelen.
        </div>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files).map((x) => x.name)]); }} />
        <div className="flex items-center gap-2">
          <button onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-white" style={{ fontSize: 12, color: "#2B5E80", border: "1.5px dashed #CBD5E1" }}>
            <Upload size={13} /> Upload beleidsstuk
          </button>
          <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md bg-white" style={{ border: "0.5px solid #D0D5DD" }}>
            <Link2 size={13} color="#667085" />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="Plak een URL of SharePoint-link…" className="flex-1 outline-none bg-transparent" style={{ fontSize: 12, color: "#101828" }} />
            <button onClick={addLink} style={{ fontSize: 11.5, color: "#2C6489" }}>Koppel</button>
          </div>
        </div>
        {(files.length > 0 || links.length > 0) && (
          <div className="flex flex-col gap-1.5 mt-3">
            {files.map((f, i) => (<AttachmentRow key={`f${i}`} icon={<FileText size={13} color="#2C6489" />} label={f} onRemove={() => setFiles(files.filter((_, j) => j !== i))} />))}
            {links.map((l, i) => (<AttachmentRow key={`l${i}`} icon={<Link2 size={13} color="#2C6489" />} label={l} onRemove={() => setLinks(links.filter((_, j) => j !== i))} />))}
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 mt-5 rounded-lg px-4 py-3" style={{ backgroundColor: "#E9F2F8", border: "0.5px solid #CFE4F1" }}>
        <Sparkles size={14} color="#2C6489" style={{ marginTop: 1 }} />
        <span style={{ fontSize: 11.5, color: "#2C6489", lineHeight: 1.5 }}>
          {isNew
            ? "Beantwoord de vragen van de assistent rechts. Zodra de context compleet is, gaat u via ‘Volgende’ naar het overzicht."
            : "De assistent heeft dit project al deels ingevuld. Vul aan of pas aan in de chat, en ga via ‘Volgende’ naar het overzicht."}
        </span>
      </div>
    </div>
  );
}

function AttachmentRow({ icon, label, onRemove }: { icon: React.ReactNode; label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white" style={{ fontSize: 12, color: "#344054", border: "0.5px solid #E4E7EC" }}>
      {icon}<span className="flex-1 truncate">{label}</span>
      <button onClick={onRemove} style={{ color: "#98A2B3" }}><Trash2 size={12} /></button>
    </div>
  );
}

// ---- Step 2: Variabelen — theme importance ---------------------------------

function ThemeImportanceStep({ weights, setWeights, scenarios, setScenarios }: {
  weights: Record<string, number>; setWeights: (w: Record<string, number>) => void;
  scenarios: Scenario[]; setScenarios: (s: Scenario[]) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const patchSc = (id: string, p: Partial<Scenario>) => setScenarios(scenarios.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const addSc = () => {
    const color = scenarioColors[scenarios.length % scenarioColors.length];
    setScenarios([...scenarios, { id: uid(), name: `Variant ${scenarios.length + 1}`, mw: 40, color, rationale: "" }]);
    setConfirmed(false);
  };
  const removeSc = (id: string) => { setScenarios(scenarios.filter((s) => s.id !== id)); setConfirmed(false); };

  return (
    <div className="px-10 py-8 w-full" style={{ maxWidth: 860 }}>
      <h2 style={{ fontSize: 18, color: "#101828", fontWeight: 500 }}>Variabelen</h2>
      <p style={{ fontSize: 12.5, color: "#667085", marginTop: 4, marginBottom: 24, maxWidth: 680 }}>
        Geef het belang van elk thema aan en bepaal welke scenario's u wilt doorrekenen.
      </p>

      {/* Theme importance */}
      <h3 style={{ fontSize: 13, color: "#101828", marginBottom: 10 }}>Belang per thema</h3>
      <section className="rounded-xl bg-white p-5 mb-8" style={{ border: "0.5px solid #E4E7EC" }}>
        <div className="flex flex-col gap-5">
          {themes.map((t) => (
            <ThemeSlider key={t.key} label={t.label} hint={themeHint[t.key]} value={weights[t.key]} onChange={(v) => setWeights({ ...weights, [t.key]: v })} />
          ))}
        </div>
      </section>

      {/* Scenario selection */}
      <div className="flex items-center gap-2 mb-1.5">
        <h3 style={{ fontSize: 13, color: "#101828" }}>Scenario's bepalen</h3>
        <span className="px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: "#2C6489", backgroundColor: "#E4F0F8" }}>{scenarios.length} {scenarios.length === 1 ? "scenario" : "scenario's"}</span>
      </div>
      <p style={{ fontSize: 11.5, color: "#98A2B3", marginBottom: 12, maxWidth: 680 }}>
        Bepaal op welke omvangvarianten u wilt doorrekenen en waarom. Voeg scenario's toe of verwijder ze — één, twee, drie of meer.
      </p>
      <div className="flex flex-col gap-3">
        {scenarios.map((s) => (
          <div key={s.id} className="group rounded-xl bg-white p-4 relative" style={{ border: "0.5px solid #E4E7EC", borderLeft: `3px solid ${s.color}` }}>
            <button onClick={() => removeSc(s.id)} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" style={{ top: 10, right: 10, color: "#98A2B3" }} title="Verwijder scenario"><Trash2 size={13} /></button>
            <div className="flex items-center gap-3 mb-2" style={{ paddingRight: 24 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: s.color, flexShrink: 0 }} />
              <input value={s.name} onChange={(e) => { patchSc(s.id, { name: e.target.value }); setConfirmed(false); }} className="bg-transparent outline-none rounded px-1.5 py-1 focus:bg-[#FAFBFC]" style={{ fontSize: 13, fontWeight: 500, color: "#101828", border: "0.5px solid transparent", flex: 1 }} onFocus={(e) => (e.currentTarget.style.border = "0.5px solid #CFE4F1")} onBlur={(e) => (e.currentTarget.style.border = "0.5px solid transparent")} />
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: 11, color: "#667085" }}>Omvang</span>
                <input type="number" min={5} max={300} value={s.mw} onChange={(e) => { patchSc(s.id, { mw: Number(e.target.value) }); setConfirmed(false); }} className="bg-transparent outline-none rounded px-1.5 py-1 focus:bg-white" style={{ width: 64, fontSize: 12.5, color: "#101828", fontWeight: 500, border: "0.5px solid #E4E7EC", textAlign: "right" }} />
                <span style={{ fontSize: 11, color: "#98A2B3" }}>MW</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <span style={{ fontSize: 11, color: "#98A2B3", marginTop: 5, width: 64, flexShrink: 0 }}>Waarom?</span>
              <textarea value={s.rationale} onChange={(e) => { patchSc(s.id, { rationale: e.target.value }); }} rows={2} placeholder="Waarom wilt u dit scenario doorrekenen?" className="flex-1 bg-transparent outline-none rounded px-1.5 py-1 resize-none focus:bg-[#FAFBFC]" style={{ fontSize: 12, color: "#344054", lineHeight: 1.45, border: "0.5px solid transparent" }} onFocus={(e) => (e.currentTarget.style.border = "0.5px solid #CFE4F1")} onBlur={(e) => (e.currentTarget.style.border = "0.5px solid transparent")} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addSc} className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded-md" style={{ fontSize: 11.5, color: "#2B5E80", backgroundColor: "#E9F2F8", border: "0.5px solid #CFE4F1" }}><Plus size={12} /> Scenario toevoegen</button>

      {/* Confirmation */}
      <button
        onClick={() => setConfirmed((c) => !c)}
        className="flex items-center gap-2.5 mt-6 px-4 py-3 rounded-lg w-full text-left transition-colors"
        style={{ backgroundColor: confirmed ? "#E4F2EB" : "#F7F8FA", border: `0.5px solid ${confirmed ? "#B7DAC8" : "#E4E7EC"}` }}
      >
        <span className="flex items-center justify-center rounded shrink-0" style={{ width: 18, height: 18, border: confirmed ? "none" : "1px solid #D0D5DD", backgroundColor: confirmed ? "#2E9B74" : "transparent" }}>{confirmed && <Check size={12} color="#fff" />}</span>
        <span style={{ fontSize: 12, color: confirmed ? "#1F7A57" : "#475467" }}>
          Ik bevestig dat dit de {scenarios.length} {scenarios.length === 1 ? "variant is" : "varianten zijn"} waarop ik wil doorrekenen.
        </span>
      </button>
    </div>
  );
}

function ThemeSlider({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  const pct = ((value - 1) / 4) * 100;
  const c = weightColor[value];
  return (
    <div className="flex items-center gap-4">
      <div style={{ width: 150 }}>
        <div style={{ fontSize: 12.5, color: "#101828", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 10.5, color: "#98A2B3", marginTop: 1, lineHeight: 1.3 }}>{hint}</div>
      </div>
      <div className="flex-1 relative" style={{ height: 18 }}>
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full" style={{ height: 4, backgroundColor: "#E4E7EC" }} />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full" style={{ height: 4, width: `${pct}%`, backgroundColor: c }} />
        <input type="range" min={1} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
        <div className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `calc(${pct}% - 7px)`, width: 14, height: 14, border: `2px solid ${c}` }} />
        {/* tick marks */}
        <div className="absolute left-0 right-0 flex justify-between" style={{ top: -2 }}>
          {[1, 2, 3, 4, 5].map((n) => (<span key={n} style={{ width: 2, height: 2, borderRadius: 999, backgroundColor: "#CBD5E1" }} />))}
        </div>
      </div>
      <span className="px-2 py-0.5 rounded text-center" style={{ width: 86, fontSize: 11, color: c, backgroundColor: `${c}15`, border: `0.5px solid ${c}33` }}>{weightLabels[value]}</span>
    </div>
  );
}

function InlineInput({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  return (
    <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent outline-none rounded px-1.5 py-1 transition-colors focus:bg-white"
      style={{ border: "0.5px solid transparent", ...style }}
      onFocus={(e) => (e.currentTarget.style.border = "0.5px solid #CFE4F1")}
      onBlur={(e) => (e.currentTarget.style.border = "0.5px solid transparent")} />
  );
}
function InlineTextarea({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
      className="w-full bg-transparent outline-none rounded px-1.5 py-1 resize-none transition-colors focus:bg-white"
      style={{ border: "0.5px solid transparent", ...style }}
      onFocus={(e) => (e.currentTarget.style.border = "0.5px solid #CFE4F1")}
      onBlur={(e) => (e.currentTarget.style.border = "0.5px solid transparent")} />
  );
}

function ContextPanel({ flow1, setFlow1, flow2, setFlow2, decisions, setDecisions }: {
  flow1: ContextItem[]; setFlow1: (v: ContextItem[]) => void;
  flow2: ContextItem[]; setFlow2: (v: ContextItem[]) => void;
  decisions: Decision[]; setDecisions: (v: Decision[]) => void;
}) {
  const editItem = (list: ContextItem[], set: (v: ContextItem[]) => void, id: string, patch: Partial<ContextItem>) => set(list.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const flows = [
    { title: "Flow 1 · Het datacenter zelf", subtitle: "Intrinsieke kenmerken uit de assistent", list: flow1, set: setFlow1 },
    { title: "Flow 2 · Externe factoren", subtitle: "Omgevings- en systeemfactoren", list: flow2, set: setFlow2 },
  ];
  return (
    <div className="px-10 py-8 w-full" style={{ maxWidth: 1000 }}>
      <div className="flex items-center gap-2 mb-1.5">
        <MessageSquare size={14} color="#2B5E80" />
        <h2 style={{ fontSize: 18, color: "#101828", fontWeight: 500 }}>Context & beslispunten</h2>
        <span className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: "#2C6489", backgroundColor: "#E4F0F8" }}><Pencil size={10} /> aanpasbaar</span>
      </div>
      <p style={{ fontSize: 12.5, color: "#667085", marginBottom: 24, maxWidth: 680 }}>Klik op een veld om het aan te passen, voeg punten toe of verwijder ze — of vraag de assistent rechts om aanpassingen.</p>
      {flows.map((flow) => (
        <section key={flow.title} className="mb-7">
          <h3 style={{ fontSize: 13, color: "#101828", marginBottom: 2 }}>{flow.title}</h3>
          <div style={{ fontSize: 11.5, color: "#98A2B3", marginBottom: 12 }}>{flow.subtitle}</div>
          <div className="grid grid-cols-2 gap-3">
            {flow.list.map((it) => (
              <div key={it.id} className="group rounded-lg p-2.5 relative" style={{ backgroundColor: "#F7F8FA", border: "0.5px solid #E4E7EC" }}>
                <button onClick={() => flow.set(flow.list.filter((x) => x.id !== it.id))} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" style={{ top: 6, right: 6, color: "#98A2B3" }}><Trash2 size={12} /></button>
                <InlineInput value={it.label} onChange={(v) => editItem(flow.list, flow.set, it.id, { label: v })} style={{ fontSize: 11, color: "#667085" }} />
                <InlineTextarea value={it.value} onChange={(v) => editItem(flow.list, flow.set, it.id, { value: v })} style={{ fontSize: 12.5, color: "#101828", lineHeight: 1.45 }} />
              </div>
            ))}
          </div>
          <button onClick={() => flow.set([...flow.list, { id: uid(), label: "Nieuw kenmerk", value: "" }])} className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-md" style={{ fontSize: 11.5, color: "#2B5E80", backgroundColor: "#E9F2F8", border: "0.5px solid #CFE4F1" }}><Plus size={12} /> Kenmerk toevoegen</button>
        </section>
      ))}
      <section>
        <h3 style={{ fontSize: 13, color: "#101828", marginBottom: 12 }}>Beslispunten</h3>
        <div className="grid grid-cols-2 gap-3">
          {decisions.map((d) => {
            const st = decStatusStyle[d.status];
            return (
              <div key={d.id} className="group rounded-lg p-2.5 relative" style={{ backgroundColor: "#F7F8FA", border: "0.5px solid #E4E7EC" }}>
                <div className="flex items-start justify-between gap-2">
                  <InlineInput value={d.title} onChange={(v) => setDecisions(decisions.map((x) => (x.id === d.id ? { ...x, title: v } : x)))} style={{ fontSize: 12.5, color: "#101828", fontWeight: 500 }} />
                  <button onClick={() => setDecisions(decisions.map((x) => (x.id === d.id ? { ...x, status: decisionCycle[x.status] } : x)))} className="px-2 py-0.5 rounded shrink-0 mt-1" style={{ fontSize: 10.5, color: st.fg, backgroundColor: st.bg, border: `0.5px solid ${st.bd}` }}>{d.status}</button>
                </div>
                <InlineTextarea value={d.desc} onChange={(v) => setDecisions(decisions.map((x) => (x.id === d.id ? { ...x, desc: v } : x)))} style={{ fontSize: 12, color: "#475467", lineHeight: 1.5 }} />
                <button onClick={() => setDecisions(decisions.filter((x) => x.id !== d.id))} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" style={{ bottom: 6, right: 6, color: "#98A2B3" }}><Trash2 size={12} /></button>
              </div>
            );
          })}
        </div>
        <button onClick={() => setDecisions([...decisions, { id: uid(), title: "Nieuw beslispunt", status: "Open", desc: "" }])} className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-md" style={{ fontSize: 11.5, color: "#2B5E80", backgroundColor: "#E9F2F8", border: "0.5px solid #CFE4F1" }}><Plus size={12} /> Beslispunt toevoegen</button>
      </section>
    </div>
  );
}

function VariablesPanel({ vars, setVars }: { vars: Variable[]; setVars: (v: Variable[]) => void }) {
  const patch = (i: number, p: Partial<Variable>) => { const next = [...vars]; next[i] = { ...next[i], ...p }; setVars(next); };
  const importanceCycle: Record<Importance, Importance> = { Hoog: "Middel", Middel: "Laag", Laag: "Hoog" };
  return (
    <div className="px-10 py-8 w-full" style={{ maxWidth: 1080 }}>
      <div className="flex items-center gap-2 mb-1.5">
        <h2 style={{ fontSize: 18, color: "#101828", fontWeight: 500 }}>Variabelen</h2>
        <span className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: "#2C6489", backgroundColor: "#E4F0F8" }}><Pencil size={10} /> aanpasbaar</span>
      </div>
      <p style={{ fontSize: 12.5, color: "#667085", marginBottom: 20, maxWidth: 720 }}>Bewerk de inhoud, het type (gegeven of keuze) en het belang. Wijzigingen werken direct door in de scenarioberekening.</p>
      <div className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 mb-5" style={{ backgroundColor: "#F2F4F7", border: "0.5px solid #E4E7EC" }}>
        <Lock size={13} color="#667085" />
        <span style={{ fontSize: 11.5, color: "#475467" }}><strong style={{ fontWeight: 500 }}>Omvang datacenter</strong> — scenario-as (vast): 20 · 60 · 120 MW · Belang Hoog · Bron: aanvraag initiatiefnemer</span>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid #E4E7EC" }}>
        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ backgroundColor: "#F7F8FA" }}>
            <tr><Th>Variabele</Th><Th>Type</Th><Th>Belang</Th><Th>Waarde</Th><Th>Bron</Th><Th>Onderbouwing</Th><th style={{ width: 32 }} /></tr>
          </thead>
          <tbody>
            {vars.map((v, i) => {
              const tc = typeColor[v.type]; const ic = impStyle[v.importance];
              return (
                <tr key={v.key} className="group" style={{ borderTop: "0.5px solid #E4E7EC" }}>
                  <td className="px-2 py-2" style={{ minWidth: 200 }}>
                    <InlineInput value={v.label} onChange={(val) => patch(i, { label: val })} style={{ fontSize: 12, color: "#101828" }} />
                    <div className="flex items-center gap-1 px-1.5" style={{ fontSize: 10.5, color: "#98A2B3" }}>
                      <span>eenheid:</span>
                      <input value={v.unit} onChange={(e) => patch(i, { unit: e.target.value })} className="bg-transparent outline-none rounded px-1 focus:bg-white" style={{ width: 70, border: "0.5px solid transparent" }} onFocus={(e) => (e.currentTarget.style.border = "0.5px solid #CFE4F1")} onBlur={(e) => (e.currentTarget.style.border = "0.5px solid transparent")} />
                    </div>
                  </td>
                  <td className="px-2 py-2"><button onClick={() => patch(i, { type: v.type === "keuze" ? "gegeven" : "keuze" })} className="px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: tc.fg, backgroundColor: tc.bg }}>{v.type}</button></td>
                  <td className="px-2 py-2"><button onClick={() => patch(i, { importance: importanceCycle[v.importance] })} className="px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: ic.fg, backgroundColor: ic.bg }}>{v.importance}</button></td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input type="number" value={v.value} min={v.min} max={v.max} onChange={(e) => patch(i, { value: Number(e.target.value) })} className="bg-transparent outline-none rounded px-1.5 py-1 focus:bg-white" style={{ width: 60, fontSize: 12, color: "#101828", fontWeight: 500, border: "0.5px solid #E4E7EC" }} />
                      <span style={{ fontSize: 10.5, color: "#98A2B3" }}>{v.unit}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#98A2B3", paddingLeft: 6, marginTop: 1 }}>{v.min}–{v.max}</div>
                  </td>
                  <td className="px-2 py-2" style={{ minWidth: 120 }}><InlineInput value={v.source} onChange={(val) => patch(i, { source: val })} style={{ fontSize: 11, color: "#2C6489" }} /></td>
                  <td className="px-2 py-2" style={{ minWidth: 200 }}><InlineTextarea value={v.rationale} onChange={(val) => patch(i, { rationale: val })} style={{ fontSize: 11, color: "#667085", lineHeight: 1.4 }} /></td>
                  <td className="px-1 py-2 align-top"><button onClick={() => setVars(vars.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#98A2B3" }}><Trash2 size={13} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={() => setVars([...vars, { key: uid(), label: "Nieuwe variabele", unit: "", type: "gegeven", min: 0, max: 100, value: 50, importance: "Middel", role: "contextvariabele", rationale: "", source: "" }])} className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded-md" style={{ fontSize: 11.5, color: "#2B5E80", backgroundColor: "#E9F2F8", border: "0.5px solid #CFE4F1" }}><Plus size={12} /> Variabele toevoegen</button>
    </div>
  );
}

// ---- Step 3: Scenario dashboard (maps first, then tables) ------------------

function ScenarioStep({ ctx, calc, matrix, scenarios, question, onShowInfo, onShowCalc }: { ctx: Ctx; calc: CalcRow[]; matrix: Record<string, Impact[]>; scenarios: Scenario[]; question: string; onShowInfo: () => void; onShowCalc: () => void }) {
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : `${n}`.replace(".", ","));
  const val = (key: string, i: number) => calc.find((c) => c.key === key)!.values[i];
  const countWord = scenarios.length === 1 ? "Eén variant" : `${scenarios.length} omvangvarianten`;
  const idx = scenarios.map((_, i) => i);
  const sortedIdx = [...idx].sort((a, b) => scenarios[a].mw - scenarios[b].mw);
  const smallI = sortedIdx[0];
  const bigI = sortedIdx[sortedIdx.length - 1];
  const small = scenarios[smallI];
  const big = scenarios[bigI];
  const flagsFor = (i: number) => themes.filter((t) => matrix[t.key][i].attention).map((t) => t.label.toLowerCase());
  const bigFlags = flagsFor(bigI);
  const fmtList = (arr: string[]) => (arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " en " + arr[arr.length - 1]);

  return (
    <div className="px-10 py-8 w-full" style={{ maxWidth: 1100 }}>
      <h2 style={{ fontSize: 18, color: "#101828", fontWeight: 500 }}>Scenario's</h2>
      <p style={{ fontSize: 12.5, color: "#667085", marginTop: 4, marginBottom: 20, maxWidth: 640 }}>{countWord} in beeld — eerst de conclusie, dan ruimtelijk op de kaart en in een impacttabel, met een uitgebreide samenvatting onderaan.</p>

      {/* Written conclusion (now at the top), including the question */}
      <section className="rounded-xl p-6 mb-7" style={{ backgroundColor: "#F4F8FB", border: "0.5px solid #CFE4F1" }}>
        <h3 className="flex items-center gap-1.5" style={{ fontSize: 13.5, color: "#101828", marginBottom: 12 }}><Lightbulb size={15} color="#2C6489" /> Conclusie</h3>
        <div className="flex flex-col gap-3" style={{ fontSize: 13, color: "#2C4A60", lineHeight: 1.7, maxWidth: 720 }}>
          <p><strong style={{ fontWeight: 500, color: "#1B3A4F" }}>De vraagstelling.</strong> {question || "Hoe verhoudt de vestiging van een hyperscale-datacenter zich tot de opgaven rond woningbouw, water en energie-infrastructuur in het gebied?"} Hiervoor zijn {scenarios.length === 1 ? "één omvangvariant uitgewerkt" : `${scenarios.length} omvangvarianten uitgewerkt`}: {fmtList(scenarios.map((s) => `${s.name} (${s.mw} MW)`))}.</p>
          <p>Afwegend tussen maatschappelijke opbrengst en druk op het systeem komt <strong style={{ fontWeight: 500 }}>{small.name} ({small.mw} MW)</strong> naar voren als de meest verdedigbare variant: de werkgelegenheid en restwarmte zijn substantieel, terwijl de belasting van water en stroomnet binnen aanvaardbare grenzen blijft.</p>
          <p>{big.name} ({big.mw} MW) biedt de grootste economische en duurzame opbrengst, maar is alleen verantwoord wanneer {bigFlags.length > 0 ? <>de aandachtspunten rond <strong style={{ fontWeight: 500 }}>{fmtList(bigFlags)}</strong> vooraf zijn afgedekt</> : "net- en watermitigatie vooraf geborgd zijn"} — met name een tijdige netreservering bij TenneT en een verdedigbaar koelwaterplafond onder KNMI'23 Wₕ. Wij adviseren de keuze pas te maken nadat hierover bestuurlijke afspraken zijn vastgelegd.</p>
          <p style={{ fontSize: 11.5, color: "#5A7387" }}>Onderbouwing en kengetallen zijn opvraagbaar via de herleidbare doorrekening.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={onShowCalc} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white" style={{ fontSize: 11.5, backgroundColor: "#2B5E80" }}>
            <Calculator size={13} /> Bekijk de herleidbare doorrekening
          </button>
          <button onClick={onShowInfo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white" style={{ fontSize: 11.5, color: "#2B5E80", border: "0.5px solid #CFE4F1" }}>
            <Info size={13} /> Toelichting context & variabelen
          </button>
        </div>
      </section>

      <h3 className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#101828", marginBottom: 12 }}><MapIcon size={14} color="#2B5E80" /> Kaartweergave per scenario</h3>
      <MapsPanel ctx={ctx} scenarios={scenarios} />

      <div className="mt-7" />
      <MatrixPanel matrix={matrix} scenarios={scenarios} />

      {/* Reading summary for the policy maker (now at the bottom) */}
      <section className="rounded-xl bg-white p-6 mt-7" style={{ border: "0.5px solid #E4E7EC" }}>
        <h3 style={{ fontSize: 13.5, color: "#101828", marginBottom: 12 }}>Samenvatting</h3>
        <div className="flex flex-col gap-3" style={{ fontSize: 13, color: "#344054", lineHeight: 1.7, maxWidth: 720 }}>
          <p><strong style={{ fontWeight: 500, color: "#101828" }}>De context.</strong> Het betreft een hyperscale-datacenter met een ontwerp-PUE van 1,2 en beschikbare restwarmte voor het regionale warmtenet. De omgeving wordt beoordeeld onder klimaatscenario KNMI'23 Wₕ — het kritische pad voor droogte en water. In de impactzone wonen circa {ctx.inw}.000 mensen, en het hoogspanningsstation is nu al ongeveer {ctx.net}% belast met beperkte uitbreidingsruimte. Daarmee wegen energie, water en netcongestie het zwaarst.</p>
          <p><strong style={{ fontWeight: 500, color: "#101828" }}>De impact.</strong> De variant <strong style={{ fontWeight: 500 }}>{small.name}</strong> ({small.mw} MW) levert circa {val("fte", smallI)} arbeidsplaatsen, {fmt(val("water", smallI))} Mm³ koelwater per jaar en brengt de netbelasting op {val("net", smallI)}%. De variant <strong style={{ fontWeight: 500 }}>{big.name}</strong> ({big.mw} MW) verdubbelt grofweg de opbrengst — circa {val("fte", bigI)} arbeidsplaatsen en {val("warmte", bigI)} woningequivalenten aan restwarmte — maar duwt de netbelasting naar {val("net", bigI)}% en het koelwaterverbruik naar {fmt(val("water", bigI))} Mm³/jr. {bigFlags.length > 0 ? <>Bij {big.name} vragen vooral <strong style={{ fontWeight: 500, color: "#B05417" }}>{fmtList(bigFlags)}</strong> om aandacht.</> : "Er zijn bij deze variant geen harde aandachtspunten."}</p>
        </div>
      </section>
    </div>
  );
}

// ---- Herleidbare doorrekening modal (click-through from step 3) ------------

function CalcModal({ onClose, calc, scenarios }: { onClose: () => void; calc: CalcRow[]; scenarios: Scenario[] }) {
  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : `${n}`.replace(".", ","));
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="bg-white rounded-xl flex flex-col" style={{ width: "min(1000px, 94vw)", maxHeight: "88vh", border: "0.5px solid #E4E7EC" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-3.5 shrink-0" style={{ borderBottom: "0.5px solid #E4E7EC" }}>
          <div className="flex items-center gap-2">
            <Calculator size={15} color="#2B5E80" />
            <span style={{ fontSize: 14, color: "#101828", fontWeight: 500 }}>Herleidbare doorrekening</span>
          </div>
          <button onClick={onClose} style={{ color: "#667085" }}><X size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <p style={{ fontSize: 11.5, color: "#98A2B3", marginBottom: 12 }}>Elke regel toont de formule en de bron. Pas variabelen aan in stap 2 om de uitkomsten te zien veranderen.</p>
          <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid #E4E7EC" }}>
            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ backgroundColor: "#F7F8FA" }}>
                <tr>
                  <Th>Indicator</Th><Th>Formule</Th>
                  {scenarios.map((s) => (<th key={s.id} className="text-left px-3 py-2.5" style={{ fontSize: 11, fontWeight: 500 }}><span className="px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: s.color, backgroundColor: `${s.color}18`, border: `0.5px solid ${s.color}40` }}>{s.name}</span><span style={{ fontSize: 10.5, color: "#98A2B3", marginLeft: 5 }}>{s.mw} MW</span></th>))}
                  <Th>Bron</Th>
                </tr>
              </thead>
              <tbody>
                {calc.map((r) => (
                  <tr key={r.key} style={{ borderTop: "0.5px solid #E4E7EC" }}>
                    <td className="px-3 py-3" style={{ color: "#101828" }}>{r.metric}<span style={{ color: "#98A2B3", fontWeight: 400 }}> ({r.unit})</span></td>
                    <td className="px-3 py-3" style={{ color: "#667085", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{r.formula}</td>
                    {r.values.map((v, i) => (<td key={i} className="px-3 py-3" style={{ color: "#101828", fontWeight: 500 }}>{fmt(v)}</td>))}
                    <td className="px-3 py-3" style={{ color: "#2C6489", fontSize: 11 }}>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 mt-4 rounded-lg px-4 py-3" style={{ backgroundColor: "#FDF1DE", border: "0.5px solid #F5D29A" }}>
            <AlertTriangle size={13} color="#B07211" style={{ marginTop: 1 }} />
            <span style={{ fontSize: 11.5, color: "#8A5A12", lineHeight: 1.5 }}>Mock-bronnen voor demonstratie. Kengetallen zijn placeholders en moeten vóór besluitvorming worden vervangen door gevalideerde modelwaarden.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Context & variabelen info modal (opened from step 3) ------------------

function ContextInfoModal({ onClose, flow1, setFlow1, flow2, setFlow2, decisions, setDecisions, vars, setVars }: {
  onClose: () => void;
  flow1: ContextItem[]; setFlow1: (v: ContextItem[]) => void;
  flow2: ContextItem[]; setFlow2: (v: ContextItem[]) => void;
  decisions: Decision[]; setDecisions: (v: Decision[]) => void;
  vars: Variable[]; setVars: (v: Variable[]) => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="bg-white rounded-xl flex flex-col" style={{ width: "min(1040px, 94vw)", maxHeight: "88vh", border: "0.5px solid #E4E7EC" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-3.5 shrink-0" style={{ borderBottom: "0.5px solid #E4E7EC" }}>
          <div className="flex items-center gap-2">
            <Info size={15} color="#2B5E80" />
            <span style={{ fontSize: 14, color: "#101828", fontWeight: 500 }}>Toelichting — context & variabelen</span>
          </div>
          <button onClick={onClose} style={{ color: "#667085" }}><X size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ContextPanel flow1={flow1} setFlow1={setFlow1} flow2={flow2} setFlow2={setFlow2} decisions={decisions} setDecisions={setDecisions} />
          <div style={{ height: "0.5px", backgroundColor: "#E4E7EC", margin: "0 40px" }} />
          <VariablesPanel vars={vars} setVars={setVars} />
        </div>
      </div>
    </div>
  );
}

function MatrixPanel({ matrix, scenarios }: { matrix: Record<string, Impact[]>; scenarios: Scenario[] }) {
  return (
    <section className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E4E7EC" }}>
      <div className="flex items-baseline justify-between mb-4">
        <h3 style={{ fontSize: 13.5, color: "#101828" }}>Impact per thema</h3>
        <span style={{ fontSize: 11.5, color: "#667085" }}>Vergelijking van de gekozen varianten</span>
      </div>
      <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th className="text-left py-2.5 pl-2" style={{ fontSize: 11, color: "#667085", fontWeight: 500, width: 140 }}>Thema</th>
            {scenarios.map((s) => (<th key={s.id} className="text-left py-2.5" style={{ fontWeight: 500 }}><span className="px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: s.color, backgroundColor: `${s.color}18`, border: `0.5px solid ${s.color}40` }}>{s.name}</span><span style={{ fontSize: 10.5, color: "#98A2B3", marginLeft: 6 }}>({s.mw} MW)</span></th>))}
          </tr>
        </thead>
        <tbody>
          {themes.map((t, idx) => (
            <tr key={t.key} style={{ backgroundColor: idx % 2 === 0 ? "#FAFBFC" : "transparent" }}>
              <td className="py-2.5 pl-2" style={{ color: "#101828" }}>{t.label}</td>
              {matrix[t.key].map((imp, i) => (<td key={i} className="py-2.5"><ImpactCell impact={imp} /></td>))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-1.5 mt-3" style={{ fontSize: 10.5, color: "#98A2B3" }}>
        <AttentionFlag note="aandachtspunt" />
        <span>markeert een aandachtspunt, bijvoorbeeld een te sterke energievraagstijging of een vol stroomnet.</span>
      </div>
    </section>
  );
}
function AttentionFlag({ note }: { note: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded" title={note} style={{ fontSize: 9.5, color: "#B05417", backgroundColor: "#FDEBDD", border: "0.5px solid #F2C9A6" }}>
      <AlertTriangle size={10} /> let op
    </span>
  );
}

function ImpactCell({ impact }: { impact: Impact }) {
  const flag = impact.attention ? <AttentionFlag note={impact.attention} /> : null;
  if (impact.dots !== undefined) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1">{[0, 1, 2, 3, 4].map((i) => (<span key={i} style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: i < impact.dots! ? "#2B5E80" : "#E4E7EC" }} />))}</div>
        {flag}
      </div>
    );
  }
  if (impact.label) {
    const c = labelColor[impact.label];
    return (
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded" style={{ fontSize: 11, color: c, backgroundColor: `${c}15`, border: `0.5px solid ${c}33` }}>{impact.label}</span>
        {flag}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: "#101828", fontWeight: 500 }}>{impact.value}</span>
      {flag}
    </div>
  );
}

// ---- Maps -------------------------------------------------------------------

type PressurePoint = { x: number; y: number; label: string; kind: "woonkern" | "natuur" | "net" | "water" | "glasvezel" };
const pressurePoints: PressurePoint[] = [
  { x: 88, y: 72, label: "Woonkern Zoeterwoude", kind: "woonkern" },
  { x: 200, y: 55, label: "Natura 2000", kind: "natuur" },
  { x: 75, y: 128, label: "Hoogspanningsstation", kind: "net" },
  { x: 165, y: 122, label: "Waterwinning", kind: "water" },
  { x: 150, y: 45, label: "Glasvezel-knooppunt", kind: "glasvezel" },
];
const ppColor: Record<PressurePoint["kind"], string> = { woonkern: "#E5544B", natuur: "#2E9B74", net: "#7C3AED", water: "#2C6489", glasvezel: "#B07211" };

// Irregular municipality outline (CBS-bestand style), 240×170 canvas.
const municipalityPath =
  "M34,44 C58,26 104,22 146,28 C186,32 214,40 222,64 C229,86 222,104 206,116 C214,126 206,140 188,140 C168,140 156,150 132,150 C112,150 100,142 86,136 C66,142 44,136 38,118 C24,116 16,100 20,82 C14,70 18,54 34,44 Z";
// Scattered land-use patches (pixel/zoning look). c = fill colour.
const landPatches: { x: number; y: number; w: number; h: number; c: string }[] = [
  { x: 44, y: 40, w: 16, h: 12, c: "#7FB85A" }, { x: 62, y: 36, w: 10, h: 10, c: "#A9D17E" },
  { x: 96, y: 34, w: 14, h: 9, c: "#5DA047" }, { x: 130, y: 36, w: 12, h: 11, c: "#8FC267" },
  { x: 168, y: 42, w: 18, h: 13, c: "#6FB04A" }, { x: 196, y: 56, w: 14, h: 12, c: "#A9D17E" },
  { x: 40, y: 64, w: 12, h: 10, c: "#8FC267" }, { x: 58, y: 78, w: 10, h: 9, c: "#5DA047" },
  { x: 150, y: 64, w: 16, h: 12, c: "#7FB85A" }, { x: 178, y: 78, w: 12, h: 10, c: "#5DA047" },
  { x: 200, y: 92, w: 14, h: 11, c: "#8FC267" }, { x: 44, y: 96, w: 14, h: 12, c: "#A9D17E" },
  { x: 70, y: 110, w: 12, h: 10, c: "#6FB04A" }, { x: 110, y: 118, w: 16, h: 11, c: "#7FB85A" },
  { x: 150, y: 110, w: 12, h: 10, c: "#5DA047" }, { x: 178, y: 116, w: 14, h: 10, c: "#8FC267" },
  { x: 96, y: 96, w: 12, h: 9, c: "#A9D17E" }, { x: 126, y: 80, w: 12, h: 10, c: "#6FB04A" },
  // a few khaki/agricultural fields
  { x: 78, y: 52, w: 18, h: 12, c: "#E4DcB4" }, { x: 116, y: 58, w: 16, h: 11, c: "#E9E3C2" },
  { x: 138, y: 96, w: 16, h: 12, c: "#E4DcB4" }, { x: 60, y: 124, w: 14, h: 8, c: "#E9E3C2" },
];

function MapsPanel({ ctx, scenarios }: { ctx: Ctx; scenarios: Scenario[] }) {
  return (
    <section className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E4E7EC" }}>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: `repeat(${Math.min(scenarios.length, 3)}, minmax(0, 1fr))` }}>
        {scenarios.map((s) => (<MapCard key={s.id} scenario={s} ctx={ctx} />))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4" style={{ fontSize: 10.5, color: "#475467" }}>
        <LegendDot color="#C0392B" square label="Footprint datacenter" border="#7A211A" />
        <LegendDot color="#9CB7CF" round label="Impactzone" faint />
        {pressurePoints.map((p) => (<LegendDot key={p.label} color={ppColor[p.kind]} round label={p.label} />))}
      </div>
    </section>
  );
}
function LegendDot({ color, label, square, round, faint, border }: { color: string; label: string; square?: boolean; round?: boolean; faint?: boolean; border?: string }) {
  return (<span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: round ? 999 : square ? 0 : 2, backgroundColor: faint ? `${color}55` : color, border: border ? `1px solid ${border}` : "none" }} />{label}</span>);
}
function MapCard({ scenario, ctx }: { scenario: Scenario; ctx: Ctx }) {
  const baseSize = Math.sqrt(scenario.mw / 120);
  const w = 26 + baseSize * 56; const h = 16 + baseSize * 30;
  const climateFactor = 1 + 0.06 * (ctx.klim - 1);
  const radius2 = (30 + (scenario.mw / 120) * 90) * climateFactor; const radius1 = radius2 * 0.55;
  const cx = 120, cy = 96;
  const underPressure = (p: PressurePoint) => Math.hypot(p.x - cx, p.y - cy) <= radius2;
  const clipId = `muni-${scenario.id}`;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "0.5px solid #E4E7EC" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "0.5px solid #E4E7EC", backgroundColor: "#FAFBFC" }}>
        <span className="px-2 py-0.5 rounded" style={{ fontSize: 10.5, color: scenario.color, backgroundColor: `${scenario.color}18`, border: `0.5px solid ${scenario.color}40` }}>{scenario.name}</span>
        <span style={{ fontSize: 10.5, color: "#98A2B3" }}>{scenario.mw} MW</span>
      </div>
      <svg viewBox="0 0 240 170" width="100%" style={{ display: "block", backgroundColor: "#FFFFFF" }}>
        <defs>
          <clipPath id={clipId}><path d={municipalityPath} /></clipPath>
        </defs>
        {/* everything inside the municipality is clipped to its boundary */}
        <g clipPath={`url(#${clipId})`}>
          {/* base land */}
          <rect x="0" y="0" width="240" height="170" fill="#F7F3E6" />
          {/* scattered land-use patches */}
          {landPatches.map((p, i) => (<rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.c} opacity="0.9" />))}
          {/* protected nature area */}
          <ellipse cx="196" cy="58" rx="22" ry="14" fill="#7FB85A" opacity="0.5" />
          {/* water: meandering stream + ponds */}
          <path d="M30,150 C60,120 70,118 96,120 C120,122 128,104 150,100 C176,95 196,108 224,96" fill="none" stroke="#9CC3E6" strokeWidth="4" strokeLinecap="round" />
          <path d="M20,82 C50,76 78,86 110,80" fill="none" stroke="#9CC3E6" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="64" cy="132" rx="12" ry="6" fill="#9CC3E6" />
          <ellipse cx="176" cy="126" rx="9" ry="5" fill="#9CC3E6" />
          {/* road grid (thin dashed) */}
          <g stroke="#C9B98F" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.8">
            <line x1="20" y1="70" x2="222" y2="58" /><line x1="24" y1="96" x2="214" y2="92" />
            <line x1="40" y1="120" x2="200" y2="118" /><line x1="80" y1="30" x2="92" y2="146" />
            <line x1="130" y1="30" x2="138" y2="148" /><line x1="180" y1="40" x2="186" y2="136" />
          </g>
          {/* main roads */}
          <line x1="20" y1="66" x2="222" y2="60" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="96" y1="28" x2="110" y2="150" stroke="#FFFFFF" strokeWidth="2" />
          {/* power line to the station */}
          <line x1={cx} y1={cy} x2="75" y2="128" stroke="#7C3AED" strokeWidth="0.9" strokeDasharray="3 2" opacity="0.75" />
          {/* impact rings (clipped to municipality) */}
          <circle cx={cx} cy={cy} r={radius2} fill={scenario.color} fillOpacity="0.10" />
          <circle cx={cx} cy={cy} r={radius1} fill={scenario.color} fillOpacity="0.18" />
          {/* datacenter footprint */}
          <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="#C0392B" fillOpacity="0.85" stroke="#7A211A" strokeWidth="1" />
        </g>
        {/* municipality boundary outline */}
        <path d={municipalityPath} fill="none" stroke="#3A3A3A" strokeWidth="1.2" />
        {/* pressure points on top */}
        {pressurePoints.map((p) => {
          const hit = underPressure(p);
          return (<g key={p.label}>{hit && <circle cx={p.x} cy={p.y} r="6.5" fill="none" stroke="#C0392B" strokeWidth="1.3" opacity="0.9" />}<circle cx={p.x} cy={p.y} r="3.4" fill={ppColor[p.kind]} stroke="#fff" strokeWidth="1.2" /></g>);
        })}
      </svg>
      <div className="px-3 py-2" style={{ fontSize: 10.5, color: "#475467", borderTop: "0.5px solid #E4E7EC" }}>
        {(() => { const n = pressurePoints.filter(underPressure).length; return (<span className="flex items-center gap-1.5">{n > 0 ? <AlertTriangle size={11} color="#E5544B" /> : null}<span style={{ color: n > 0 ? "#E5544B" : "#2E9B74" }}>{n} drukpunt{n === 1 ? "" : "en"} binnen impactzone</span></span>); })()}
      </div>
    </div>
  );
}

// ---- Chat panel (controlled) ------------------------------------------------

const chatHints: Record<number, string> = {
  1: "Beantwoordt uw vragen en bouwt de context op",
  2: "Bespreek het belang van de thema's",
  3: "Vraag om scenario's te verkennen of aan te passen",
};

function ChatPanel({ step, messages, onSend }: { step: number; messages: ChatMsg[]; onSend: (t: string) => void }) {
  const [draft, setDraft] = useState("");
  const send = (t: string) => { if (!t.trim()) return; onSend(t); setDraft(""); };
  return (
    <aside className="bg-white flex flex-col" style={{ width: 360, borderLeft: "0.5px solid #E4E7EC", height: "100%" }}>
      <div className="px-5 py-3.5 shrink-0" style={{ borderBottom: "0.5px solid #E4E7EC" }}>
        <div className="flex items-center gap-2"><Sparkles size={13} color="#2B5E80" /><span style={{ fontSize: 13, color: "#101828" }}>Scenario-assistent</span></div>
        <span style={{ fontSize: 11.5, color: "#667085" }}>{chatHints[step] ?? "Scenario-assistent"}</span>
      </div>
      <div className="flex-1 min-h-0 px-5 py-4 overflow-y-auto flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col">
            {m.flow && (<div className="flex items-center gap-1.5 mb-2 mt-1"><span style={{ flex: 1, height: "0.5px", backgroundColor: "#E4E7EC" }} /><span style={{ fontSize: 10, color: "#98A2B3", letterSpacing: 0.4, textTransform: "uppercase" }}>{m.flow}</span><span style={{ flex: 1, height: "0.5px", backgroundColor: "#E4E7EC" }} /></div>)}
            <div className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
              <div className="rounded-lg px-3 py-2" style={{ fontSize: 12, lineHeight: 1.5, maxWidth: "85%", backgroundColor: m.role === "user" ? "#2C6489" : "#EFF3F7", color: m.role === "user" ? "#fff" : "#101828", border: m.role === "user" ? "none" : "0.5px solid #E4E7EC" }}>{m.text}</div>
              {m.suggestions && (<div className="flex flex-col gap-1.5 mt-2">{m.suggestions.map((s) => (<button key={s} onClick={() => send(s)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-left" style={{ fontSize: 11.5, backgroundColor: "#E9F2F8", color: "#2B5E80", border: "0.5px solid #CFE4F1" }}>{s}<ArrowUpRight size={11} /></button>))}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 shrink-0" style={{ borderTop: "0.5px solid #E4E7EC" }}>
        <div className="flex items-end gap-2 rounded-lg p-2 bg-white" style={{ border: "0.5px solid #D0D5DD" }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }} rows={2} placeholder="Stel een vraag of beschrijf een variabele…" className="flex-1 resize-none outline-none bg-transparent" style={{ fontSize: 12, color: "#101828" }} />
          <button onClick={() => send(draft)} className="flex items-center justify-center rounded-md text-white" style={{ width: 30, height: 30, backgroundColor: "#2B5E80" }}><Send size={13} /></button>
        </div>
      </div>
    </aside>
  );
}

// ---- Step 4: Share & discuss -----------------------------------------------

type ScenarioProfile = { headline: string; positie: string; aansluitbaarheid: string; kosten: "Laag" | "Middel" | "Hoog"; kansen: string[]; risicos: string[]; advies: string };
const scenarioProfiles: ScenarioProfile[] = [
  { headline: "Bescheiden voetafdruk, ruim aansluitbaar", positie: "No-regret startfase", aansluitbaarheid: "Past binnen huidige netcapaciteit", kosten: "Laag", kansen: ["Snel vergunbaar, beperkte ruimtelijke impact", "Restwarmte dekt circa 520 woningequivalenten"], risicos: ["Beperkte economische spin-off (~104 FTE)", "Minder schaalvoordeel op infrastructuurinvestering"], advies: "Geschikt als gefaseerde startvariant met lage afbreukrisico's." },
  { headline: "Balans tussen impact en opbrengst", positie: "Voorkeursvariant (mits net geborgd)", aansluitbaarheid: "Netuitbreiding op termijn nodig", kosten: "Middel", kansen: ["Substantiële werkgelegenheid (~312 FTE)", "Forse restwarmtelevering aan warmtenet Leiden"], risicos: ["Wateronttrekking nadert plafond onder Wₕ", "Toenemende verkeersdruk op ontsluitingsweg"], advies: "Beste balans, op voorwaarde van tijdige netreservering bij TenneT." },
  { headline: "Maximale opbrengst, hoogste systeemdruk", positie: "Alleen met zware mitigatie", aansluitbaarheid: "Net op ~95% — uitbreiding noodzakelijk", kosten: "Hoog", kansen: ["Sterke digitale clustervorming (~624 FTE)", "Maximale restwarmte voor de regio"], risicos: ["Koelwater >9 Mm³/jr botst met droogtebeleid", "Vijf drukpunten binnen impactzone", "Mogelijke spanning met Natura 2000"], advies: "Pas haalbaar na geborgde net- en watermitigatie en NPLG-besluit." },
];
const meetingPoints = [
  "Is netreservering voor S2/S3 tijdig te borgen bij TenneT, gezien de huidige 75% stationbelasting?",
  "Welk koelwaterplafond is verdedigbaar onder klimaatscenario KNMI'23 Wₕ?",
  "Weegt de werkgelegenheid van S3 (~624 FTE) op tegen de landschaps- en waterimpact?",
  "Kan verplichte restwarmtelevering als harde voorwaarde in de vergunning worden opgenomen?",
  "Welke compensatie voor de groen-blauwe structuur is nodig vóór het NPLG-besluit in Q3 2026?",
];
const kostenColor: Record<string, string> = { Laag: "#2E9B74", Middel: "#F2A33C", Hoog: "#E5544B" };

function ShareStep({ ctx, scenarios }: { calc: CalcRow[]; ctx: Ctx; scenarios: Scenario[] }) {
  const sorted = [...scenarios].sort((a, b) => a.mw - b.mw);
  const balanced = sorted[0];
  const largest = sorted[sorted.length - 1];
  const [shared, setShared] = useState<string[]>([]);
  const toggle = (n: string) => setShared((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="px-10 py-8 w-full" style={{ maxWidth: 920 }}>
      <div className="flex items-center gap-2 mb-1.5">
        <Share2 size={14} color="#2B5E80" />
        <h2 style={{ fontSize: 18, color: "#101828", fontWeight: 500 }}>Delen & bespreken</h2>
      </div>
      <p style={{ fontSize: 12.5, color: "#667085", marginBottom: 24, maxWidth: 660 }}>Exporteer het scenariodossier of deel het met collega's, en gebruik de discussiepunten als agenda voor de bestuurlijke vergadering.</p>

      {/* Export & share */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <section className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E4E7EC" }}>
          <h3 style={{ fontSize: 13, color: "#101828", marginBottom: 12 }}>Exporteren</h3>
          <div className="flex flex-col gap-2">
            <button onClick={() => setDone("PDF geëxporteerd (demo)")} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white" style={{ fontSize: 12, color: "#344054", border: "0.5px solid #D0D5DD" }}><Download size={14} color="#2B5E80" /> Volledig dossier (PDF)</button>
            <button onClick={() => setDone("Scenario's geëxporteerd (demo)")} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white" style={{ fontSize: 12, color: "#344054", border: "0.5px solid #D0D5DD" }}><Download size={14} color="#2B5E80" /> Scenariovergelijking (XLSX)</button>
            <button onClick={() => setDone("Presentatie geëxporteerd (demo)")} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white" style={{ fontSize: 12, color: "#344054", border: "0.5px solid #D0D5DD" }}><Download size={14} color="#2B5E80" /> Vergaderpresentatie (PPTX)</button>
          </div>
        </section>
        <section className="rounded-xl bg-white p-5" style={{ border: "0.5px solid #E4E7EC" }}>
          <h3 style={{ fontSize: 13, color: "#101828", marginBottom: 12 }}>Delen met collega's</h3>
          <div className="flex flex-col gap-1">
            {colleagues.map((c) => {
              const on = shared.includes(c.name);
              return (
                <button key={c.name} onClick={() => toggle(c.name)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-[#F7F8FA]">
                  <span className="flex items-center justify-center rounded-full" style={{ width: 24, height: 24, fontSize: 9.5, color: "#fff", backgroundColor: "#2B5E80" }}>{c.initials}</span>
                  <span className="flex-1 min-w-0"><span className="block truncate" style={{ fontSize: 12, color: "#101828" }}>{c.name}</span><span className="block truncate" style={{ fontSize: 10.5, color: "#98A2B3" }}>{c.role}</span></span>
                  <span className="flex items-center justify-center rounded" style={{ width: 18, height: 18, border: on ? "none" : "1px solid #D0D5DD", backgroundColor: on ? "#2E9B74" : "transparent" }}>{on && <Check size={12} color="#fff" />}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "#667085", marginTop: 8 }}>{shared.length === 0 ? "Nog niet gedeeld" : `Gedeeld met ${shared.length} collega${shared.length === 1 ? "" : "'s"}`}</div>
        </section>
      </div>
      {done && (<div className="flex items-center gap-2 mb-8 rounded-lg px-4 py-2.5" style={{ backgroundColor: "#E4F2EB", border: "0.5px solid #B7DAC8" }}><CircleCheck size={14} color="#2E9B74" /><span style={{ fontSize: 12, color: "#1F7A57" }}>{done}</span></div>)}

      {/* Discussion points */}
      <h3 className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#101828", marginBottom: 12 }}><ClipboardList size={14} color="#2B5E80" /> Discussiepunten voor de vergadering</h3>
      <div className="rounded-lg bg-white p-2 mb-6" style={{ border: "0.5px solid #E4E7EC" }}>
        {meetingPoints.map((m, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3 py-2.5" style={{ borderTop: i === 0 ? "none" : "0.5px solid #F0F1F4" }}>
            <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: 18, height: 18, fontSize: 10, fontWeight: 500, color: "#2B5E80", backgroundColor: "#E9F2F8" }}>{i + 1}</span>
            <span style={{ fontSize: 12, color: "#344054", lineHeight: 1.5 }}>{m}</span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2.5 rounded-lg px-4 py-3.5" style={{ backgroundColor: "#E9F2F8", border: "0.5px solid #CFE4F1" }}>
        <Lightbulb size={15} color="#2C6489" style={{ marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12.5, color: "#2C6489", fontWeight: 500, marginBottom: 3 }}>Voorlopige aanbeveling</div>
          <span style={{ fontSize: 12, color: "#2C6489", lineHeight: 1.55 }}>Bij de huidige aannames (KNMI'23 Wₕ, netbelasting {ctx.net}%) biedt <strong style={{ fontWeight: 500 }}>{balanced.name} ({balanced.mw} MW)</strong> de gunstigste balans tussen maatschappelijke opbrengst en systeemdruk.{scenarios.length > 1 && <> De variant <strong style={{ fontWeight: 500 }}>{largest.name} ({largest.mw} MW)</strong> is alleen verantwoord ná geborgde net- en watermitigatie.</>}</span>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (<th className="text-left px-3 py-2.5" style={{ fontSize: 11, color: "#667085", fontWeight: 500 }}>{children}</th>);
}
