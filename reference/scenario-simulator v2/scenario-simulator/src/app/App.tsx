import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { HomeScreen } from "./components/HomeScreen";
import { ProjectFlow } from "./components/Dashboard";

type View = "home" | "project";

const projectTitles: Record<string, string> = {
  p1: "Datacenter Zoeterwoude",
  p2: "Woningbouw Gouda-Oost",
  p3: "Energietransitie Rijnmond",
};

export default function App() {
  const [view, setView] = useState<View>("home");
  const [activeProjectId, setActiveProjectId] = useState("p1");
  const [initialStep, setInitialStep] = useState(1);
  const [isNew, setIsNew] = useState(false);
  const [flowKey, setFlowKey] = useState(0);

  const openNew = () => {
    setActiveProjectId("new");
    setIsNew(true);
    setInitialStep(1);
    setFlowKey((k) => k + 1);
    setView("project");
  };
  const openProject = (id: string) => {
    setActiveProjectId(id);
    setIsNew(false);
    setInitialStep(3);
    setFlowKey((k) => k + 1);
    setView("project");
  };

  const projectName = activeProjectId === "new" ? "Nieuw project" : projectTitles[activeProjectId] ?? "Project";
  const crumbs =
    view === "home"
      ? ["Provincie Zuid-Holland", "Overzicht"]
      : ["Provincie Zuid-Holland", projectName];

  return (
    <div
      className="flex bg-[#F4F6F8]"
      style={{ fontFamily: "Inter, system-ui, sans-serif", height: "100vh", overflow: "hidden", width: "100%" }}
    >
      <Sidebar
        view={view === "home" ? "home" : "dashboard"}
        onNavigate={(v) => {
          if (v === "home") setView("home");
          else openProject(activeProjectId === "new" ? "p1" : activeProjectId);
        }}
        activeProjectId={activeProjectId}
        onSelectProject={openProject}
        onNewProject={openNew}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar crumbs={crumbs} actions="none" />
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {view === "home" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <HomeScreen onSelect={openProject} onNew={openNew} />
            </div>
          )}
          {view === "project" && (
            <ProjectFlow
              key={flowKey}
              initialStep={initialStep}
              isNew={isNew}
              onExit={() => setView("home")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
