import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FolderHeart,
  Activity,
  Thermometer,
  ScanLine,
  ClipboardList,
  Calendar,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Check,
  X,
  FileText,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/records")({
  head: () => ({ meta: [{ title: "My Records" }] }),
  component: RecordsPage,
});

type RiskTier = "low" | "moderate" | "high";

type TriageRecord = {
  id: string;
  title: string;
  date: string; // ISO
  risk: RiskTier;
  chiefComplaint: string;
  summary: string;
  evidence: { label: string; value: string; icon: "log" | "temp" | "vitals" | "scan" }[];
  doList: string[];
  dontList: string[];
  recommendation: string;
};

const SAMPLE_RECORDS: TriageRecord[] = [
  {
    id: "rec-001",
    title: "Viral Fever Assessment",
    date: "2026-06-22T09:14:00+05:30",
    risk: "moderate",
    chiefComplaint: "Fever, body ache, mild cough",
    summary:
      "Symptoms consistent with a viral upper-respiratory infection. Monitor temperature every 6 hours and seek in-person care if fever persists beyond 72 hours or breathing worsens.",
    evidence: [
      { icon: "log", label: "Symptom Log", value: "Fever persisting > 48 hours" },
      { icon: "temp", label: "Vitals Input", value: "Body Temperature 101.2°F" },
      { icon: "vitals", label: "Vitals Input", value: "Heart Rate 96 BPM · SpO₂ 97%" },
      { icon: "scan", label: "Image Analysis", value: "Mild throat erythema noted" },
    ],
    doList: [
      "Maintain hydration with boiled water",
      "Rest completely and avoid exertion",
      "Take paracetamol as per label for fever",
      "Eat light, easily digestible meals",
    ],
    dontList: [
      "Do not self-prescribe antibiotics",
      "Avoid cold exposure and unfiltered water",
      "Do not ignore worsening symptoms",
    ],
    recommendation: "Visit a General Physician within 24 hours if fever continues.",
  },
  {
    id: "rec-002",
    title: "Skin Rash Triage",
    date: "2026-06-15T17:42:00+05:30",
    risk: "low",
    chiefComplaint: "Itchy red patches on forearm",
    summary:
      "Likely contact dermatitis. No systemic involvement detected. Topical care and allergen avoidance should resolve within 5–7 days.",
    evidence: [
      { icon: "log", label: "Symptom Log", value: "Onset 2 days ago, no fever" },
      { icon: "scan", label: "Image Analysis", value: "Localised erythema, no pus" },
    ],
    doList: [
      "Apply prescribed antihistamine cream twice daily",
      "Wear loose cotton clothing",
      "Keep area clean and dry",
    ],
    dontList: [
      "Do not scratch the affected area",
      "Avoid scented soaps and detergents",
    ],
    recommendation: "Self-care for 5 days; consult dermatologist if it spreads.",
  },
  {
    id: "rec-003",
    title: "Chest Discomfort — Urgent Review",
    date: "2026-05-30T22:08:00+05:30",
    risk: "high",
    chiefComplaint: "Sharp chest pain radiating to left arm",
    summary:
      "Reported symptoms include cardiac warning signs. Immediate in-person evaluation strongly advised. Patient was directed to nearest tertiary care emergency wing.",
    evidence: [
      { icon: "log", label: "Symptom Log", value: "Pain duration 25 minutes" },
      { icon: "vitals", label: "Vitals Input", value: "HR 112 BPM · BP 148/96" },
      { icon: "temp", label: "Vitals Input", value: "Temp 98.6°F" },
    ],
    doList: [
      "Call emergency services or reach hospital immediately",
      "Sit upright and stay calm",
      "Chew aspirin 325mg if not allergic and advised",
    ],
    dontList: [
      "Do not drive yourself to the hospital",
      "Do not delay seeking emergency care",
      "Do not eat or drink anything",
    ],
    recommendation: "Emergency: head to nearest cardiac care unit now.",
  },
  {
    id: "rec-004",
    title: "Seasonal Allergy Check-in",
    date: "2026-05-12T08:25:00+05:30",
    risk: "low",
    chiefComplaint: "Sneezing, watery eyes, nasal congestion",
    summary:
      "Pattern matches allergic rhinitis triggered by pollen. Symptoms are non-progressive and respond well to OTC antihistamines.",
    evidence: [
      { icon: "log", label: "Symptom Log", value: "Recurring each morning" },
      { icon: "vitals", label: "Vitals Input", value: "SpO₂ 99% · HR 78 BPM" },
    ],
    doList: [
      "Take cetirizine 10mg once daily as needed",
      "Use saline nasal rinse morning and night",
      "Keep windows closed during high pollen hours",
    ],
    dontList: [
      "Avoid dusty / outdoor exercise mid-day",
      "Do not combine multiple antihistamines",
    ],
    recommendation: "Continue OTC care; review with ENT if persists > 4 weeks.",
  },
];

const STORAGE_KEY = "healthbox.records.v1";

const RISK_META: Record<RiskTier, { label: string; chip: string; ring: string; Icon: typeof ShieldCheck }> = {
  low: {
    label: "Low Risk",
    chip: "bg-success/15 text-success",
    ring: "ring-success/30",
    Icon: ShieldCheck,
  },
  moderate: {
    label: "Moderate Risk",
    chip: "bg-warning/15 text-warning",
    ring: "ring-warning/30",
    Icon: AlertTriangle,
  },
  high: {
    label: "High Risk",
    chip: "bg-destructive/15 text-destructive",
    ring: "ring-destructive/30",
    Icon: AlertOctagon,
  },
};

const EVIDENCE_ICON = {
  log: ClipboardList,
  temp: Thermometer,
  vitals: Activity,
  scan: ScanLine,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadRecords(): TriageRecord[] {
  if (typeof window === "undefined") return SAMPLE_RECORDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_RECORDS));
      return SAMPLE_RECORDS;
    }
    const parsed = JSON.parse(raw) as TriageRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_RECORDS;
  } catch {
    return SAMPLE_RECORDS;
  }
}

function RecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TriageRecord[]>(SAMPLE_RECORDS);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  const active = records.find((r) => r.id === openId) ?? null;

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-4">
        <header className="sticky top-0 z-10 -mx-5 mb-3 flex items-center gap-3 bg-background/90 px-5 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => (active ? setOpenId(null) : navigate({ to: "/home" }))}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-border bg-card text-foreground active:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {active ? "Report Detail" : "Saved Triage Reports"}
            </p>
            <h1 className="truncate text-lg font-bold text-foreground">
              {active ? active.title : "My Records"}
            </h1>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <FolderHeart className="h-5 w-5" />
          </span>
        </header>

        {!active && (
          <>
            <div className="mb-3 flex items-center justify-between rounded-2xl border-2 border-border bg-card px-4 py-3">
              <span className="text-sm text-muted-foreground">Total reports</span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                {records.length} saved
              </span>
            </div>

            <ul className="flex flex-col gap-3">
              {records.map((r) => {
                const meta = RISK_META[r.risk];
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(r.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left transition active:scale-[0.99] active:bg-muted ring-1 ${meta.ring}`}
                    >
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${meta.chip}`}>
                        <meta.Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-base font-bold text-foreground">
                            {r.title}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                          {r.chiefComplaint}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(r.date)}
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.chip}`}>
                            {meta.label}
                          </span>
                        </span>
                      </span>
                      <ChevronRight className="mt-3 h-5 w-5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {active && (
          <article className="flex flex-col gap-4">
            <div className={`rounded-2xl border-2 border-border bg-card p-4 ring-1 ${RISK_META[active.risk].ring}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${RISK_META[active.risk].chip}`}>
                  {(() => {
                    const I = RISK_META[active.risk].Icon;
                    return <I className="h-6 w-6" />;
                  })()}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {RISK_META[active.risk].label}
                  </p>
                  <h2 className="truncate text-lg font-bold text-foreground">
                    {active.chiefComplaint}
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {active.summary}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(active.date)}
              </p>
            </div>

            <section className="rounded-2xl border-2 border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4" /> Evidence
              </h3>
              <ul className="flex flex-col gap-2">
                {active.evidence.map((e, i) => {
                  const I = EVIDENCE_ICON[e.icon];
                  return (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <I className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {e.label}
                        </span>
                        <span className="block text-sm font-medium text-foreground">
                          {e.value}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="grid grid-cols-1 gap-3">
              <section className="rounded-2xl border-2 border-success/30 bg-success/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-success">
                  <Check className="h-4 w-4" /> Recommended
                </h3>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {active.doList.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-destructive">
                  <X className="h-4 w-4" /> Avoid
                </h3>
                <ul className="flex flex-col gap-1.5 text-sm text-foreground">
                  {active.dontList.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">
                Next Step
              </h3>
              <p className="text-sm font-medium text-foreground">{active.recommendation}</p>
            </section>

            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="mt-1 w-full rounded-2xl border-2 border-border bg-card py-3 text-sm font-bold text-foreground active:bg-muted"
            >
              Back to all reports
            </button>
          </article>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
