import { useRef, useState } from "react";
import { Sparkles, X, Upload, Link2, FileText, Trash2 } from "lucide-react";

export function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((f) => [...f, ...Array.from(list).map((x) => x.name)]);
  };
  const addLink = () => {
    const v = linkUrl.trim();
    if (!v) return;
    setLinks((l) => [...l, v]);
    setLinkUrl("");
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div className="bg-white rounded-xl" style={{ width: 560, border: "0.5px solid #E4E7EC" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "0.5px solid #E4E7EC" }}>
          <div>
            <div style={{ fontSize: 14, color: "#101828" }}>Nieuw project</div>
            <div style={{ fontSize: 11.5, color: "#667085", marginTop: 2 }}>
              Beschrijf het beleidsvraagstuk, of bouw voort op een bestaand beleidsstuk.
            </div>
          </div>
          <button onClick={onClose} style={{ color: "#667085" }}>
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <label style={{ fontSize: 11.5, color: "#475467" }}>Beleidsvraagstuk</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Bijv.: Hoe wegen we de vestiging van een hyperscale-datacenter af tegen woningbouw, water en energie-infrastructuur in de A4-corridor?"
            className="w-full mt-1.5 px-3 py-2.5 rounded-md outline-none bg-white"
            style={{ fontSize: 12.5, color: "#101828", border: "0.5px solid #D0D5DD", resize: "vertical" }}
          />

          {/* Existing policy piece: upload or link */}
          <div className="mt-5">
            <label style={{ fontSize: 11.5, color: "#475467" }}>Bestaand beleidsstuk (optioneel)</label>
            <div style={{ fontSize: 11, color: "#98A2B3", marginTop: 2, marginBottom: 8 }}>
              Upload een document of koppel een link — de assistent gebruikt dit als startpunt voor context en variabelen.
            </div>

            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInput.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-white"
                style={{ fontSize: 12, color: "#2B5E80", border: "1.5px dashed #CBD5E1" }}
              >
                <Upload size={13} />
                Upload beleidsstuk
              </button>
              <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-md bg-white" style={{ border: "0.5px solid #D0D5DD" }}>
                <Link2 size={13} color="#667085" />
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                  placeholder="Plak een URL of SharePoint-link…"
                  className="flex-1 outline-none bg-transparent"
                  style={{ fontSize: 12, color: "#101828" }}
                />
                <button onClick={addLink} style={{ fontSize: 11.5, color: "#2C6489" }}>
                  Koppel
                </button>
              </div>
            </div>

            {(files.length > 0 || links.length > 0) && (
              <div className="flex flex-col gap-1.5 mt-3">
                {files.map((f, i) => (
                  <AttachmentRow key={`f${i}`} icon={<FileText size={13} color="#2C6489" />} label={f} onRemove={() => setFiles((arr) => arr.filter((_, j) => j !== i))} />
                ))}
                {links.map((l, i) => (
                  <AttachmentRow key={`l${i}`} icon={<Link2 size={13} color="#2C6489" />} label={l} onRemove={() => setLinks((arr) => arr.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3.5"
          style={{ borderTop: "0.5px solid #E4E7EC", backgroundColor: "#FAFBFC", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
        >
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-white" style={{ fontSize: 12, color: "#475467", border: "0.5px solid #D0D5DD" }}>
            Annuleer
          </button>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white"
            style={{ fontSize: 12, backgroundColor: "#2B5E80" }}
          >
            <Sparkles size={12} />
            Genereer met AI
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachmentRow({ icon, label, onRemove }: { icon: React.ReactNode; label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white" style={{ fontSize: 12, color: "#344054", border: "0.5px solid #E4E7EC" }}>
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <button onClick={onRemove} style={{ color: "#98A2B3" }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}
