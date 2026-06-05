import { LayoutGrid, Home, Settings, Plus, Sparkles } from "lucide-react";

type Project = {
  id: string;
  name: string;
  status: "active" | "draft" | "concept";
};

const projects: Project[] = [
  { id: "p1", name: "Datacenter Zoeterwoude", status: "active" },
  { id: "p2", name: "Woningbouw Gouda-Oost", status: "draft" },
  { id: "p3", name: "Energietransitie Rijnmond", status: "active" },
];

const statusColor: Record<Project["status"], string> = {
  active: "#F2A33C",
  draft: "#4191C2",
  concept: "#9CA3AF",
};

type Props = {
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  view: "home" | "dashboard" | "project";
  onNavigate: (v: "home" | "dashboard" | "project") => void;
  onNewProject: () => void;
};

export function Sidebar({ activeProjectId, onSelectProject, view, onNavigate, onNewProject }: Props) {
  return (
    <aside
      className="flex flex-col text-white"
      style={{ width: 220, backgroundColor: "#2B5E80", minHeight: "100vh" }}
    >
      <div className="px-4 pt-5 pb-5" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#4191C2" }}
          >
            <Sparkles size={15} />
          </div>
          <div className="flex flex-col leading-tight">
            <span style={{ fontSize: 13 }}>Scenario Simulator</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Provincie Zuid-Holland</span>
          </div>
        </div>
      </div>

      <nav className="px-2 py-3 flex flex-col gap-0.5">
        <NavItem icon={<Home size={14} />} label="Overzicht" active={view === "home"} onClick={() => onNavigate("home")} />
        <NavItem icon={<LayoutGrid size={14} />} label="Dashboard" active={view === "dashboard"} onClick={() => onNavigate("dashboard")} />
        <NavItem icon={<Settings size={14} />} label="Instellingen" active={false} onClick={() => {}} />
      </nav>

      <div className="px-4 pt-2 pb-1.5">
        <span style={{ fontSize: 10, letterSpacing: 0.6, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
          Projecten
        </span>
      </div>

      <div className="px-2 flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {projects.map((p) => {
          const isActive = p.id === activeProjectId;
          return (
            <button
              key={p.id}
              onClick={() => {
                onSelectProject(p.id);
                if (view === "home") onNavigate("dashboard");
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md transition-colors"
              style={{
                fontSize: 12,
                backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: statusColor[p.status],
                  flexShrink: 0,
                }}
              />
              <span className="truncate">{p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="px-3 pt-2 pb-3">
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors"
          style={{
            fontSize: 12,
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "0.5px solid rgba(255,255,255,0.18)",
            color: "#fff",
          }}
        >
          <Plus size={13} />
          Nieuw project
        </button>
      </div>

      <div
        className="px-3 py-3 flex items-center gap-2"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: "#4191C2", fontSize: 11 }}
        >
          MV
        </div>
        <div className="flex flex-col leading-tight">
          <span style={{ fontSize: 12 }}>Marleen Visser</span>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)" }}>Beleidsadviseur</span>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md transition-colors"
      style={{
        fontSize: 12,
        backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.78)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
