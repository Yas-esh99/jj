import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Volume2,
  Pause,
  Download,
  Check,
  X,
  Activity,
  Thermometer,
  ScanLine,
  ClipboardList,
  Hospital,
  Landmark,
  Star,
  MapPin,
  Phone,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";

type RiskTier = "low" | "moderate" | "high" | "critical";

export const Route = createFileRoute("/triage-results")({
  head: () => ({ meta: [{ title: "Clinical Summary Report" }] }),
  component: TriageResultsPage,
});

const RISK_CONFIG: Record<
  RiskTier,
  { label: string; block: string }
> = {
  low: { label: "Low Risk", block: "bg-success text-success-foreground" },
  moderate: { label: "Moderate Risk", block: "bg-warning text-warning-foreground" },
  high: { label: "High Risk", block: "bg-destructive text-destructive-foreground" },
  critical: { label: "Critical Emergency", block: "bg-destructive text-destructive-foreground" },
};

const PRIVATE_HOSPITALS = [
  {
    name: "Apollo Hospitals",
    specialty: "Multi-Specialty · 24x7 Emergency",
    distance: "2.1 km away",
    rating: 4.8,
    address: "Bannerghatta Road, Bangalore",
    phone: "+91 80 4030 4050",
  },
  {
    name: "Fortis Healthcare",
    specialty: "Cardiac & Orthopedic Care",
    distance: "3.4 km away",
    rating: 4.7,
    address: "Cunningham Road, Bangalore",
    phone: "+91 80 4195 4444",
  },
  {
    name: "Manipal Hospital",
    specialty: "Oncology & Critical Care",
    distance: "5.2 km away",
    rating: 4.6,
    address: "Old Airport Road, Bangalore",
    phone: "+91 80 2502 4444",
  },
  {
    name: "Narayana Health",
    specialty: "Affordable Multi-Specialty",
    distance: "6.8 km away",
    rating: 4.5,
    address: "Hosur Road, Bangalore",
    phone: "+91 80 7123 4567",
  },
];

function TriageResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPrivateHospitals, setShowPrivateHospitals] = useState(false);

  // @ts-ignore
  const report = location.state?.report || {
    report_id: "HB-2026-9941",
    emergency_level: "moderate",
    primary_diagnosis: "Viral Pharyngitis",
    confidence_percentage: "89%",
    condition_stage: "Acute",
    clinical_evidence: [
      "Fever persisting > 48 hours",
      "Body Temperature 101.2°F",
      "Heart Rate 96 BPM · SpO₂ 97%",
      "Dermal boundary irritation detected"
    ],
    approved_protocols: [
      "Maintain adequate hydration with boiled water",
      "Rest completely and avoid exertion",
      "Take paracetamol as per label for fever",
      "Eat light, easily digestible meals"
    ],
    contraindicated_actions: [
      "Do not self-prescribe unverified antibiotics",
      "Do not engage in heavy physical strain",
      "Avoid cold exposure and unfiltered water",
      "Do not ignore worsening symptoms"
    ],
    precautions: [
      "Record body temperature at 6-hour intervals and note any spikes.",
      "Continue home care with rest and fluids; monitor appetite.",
      "Consult a physical physician if symptoms fail to resolve within 48 hours."
    ]
  };

  const risk = (report.emergency_level?.toLowerCase() || "moderate") as RiskTier;
  const cfg = RISK_CONFIG[risk] || RISK_CONFIG.moderate;

  const timestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-dvh bg-background pb-12">
      <div className="mx-auto w-full max-w-md px-5 pt-4">
        {/* 1. INSTITUTIONAL IDENTIFICATION & TOOLS */}
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/symptoms" })}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-border bg-card text-foreground active:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black leading-tight text-primary">
              Healthbox Clinical Summary Report
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-muted-foreground">
              <span>Report ID: {report.report_id}</span>
              <span>Timestamp: {timestamp}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AudioToggle />
            <button
              type="button"
              onClick={() => toast.success("Downloading report PDF")}
              aria-label="Download report"
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-border bg-card text-foreground active:bg-muted"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* 2. PRIMARY DIAGNOSIS & STATUS FIELDS */}
        <section className="mt-6">
          <div
            className={
              "flex items-center justify-between rounded-xl px-4 py-3 text-base font-black shadow-sm " +
              cfg.block
            }
          >
            <span>Emergency Level</span>
            <span>{cfg.label}</span>
          </div>

          <div className="mt-4 rounded-3xl border-2 border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Primary Diagnosis
            </p>
            <h2 className="mt-1 text-3xl font-black leading-tight text-foreground">
              {report.primary_diagnosis}
            </h2>
            <p className="mt-2 text-sm font-bold text-primary">
              Clinical Correlation Confidence: {report.confidence_percentage}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm font-bold text-foreground">
              Condition Stage: {report.condition_stage}
            </div>
          </div>
        </section>

        {/* 3. CLINICAL EVIDENCE BASE */}
        <section className="mt-7">
          <h3 className="text-lg font-black text-foreground">Clinical Evidence Base</h3>
          <div className="mt-3 divide-y-2 divide-border rounded-2xl border-2 border-border bg-card">
            {report.clinical_evidence.map((evidence: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Evidence {(idx + 1).toString().padStart(2, '0')}
                  </p>
                  <p className="text-[15px] font-semibold text-foreground">{evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. ACTIONABLE PROTOCOLS */}
        <section className="mt-7">
          <h3 className="text-lg font-black text-foreground">Actionable Protocols</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Column A — Do */}
            <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-4">
              <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-success">
                Approved Protocols
              </h4>
              <ul className="space-y-2.5">
                {report.approved_protocols.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column B — Don't */}
            <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4">
              <h4 className="mb-3 text-sm font-black uppercase tracking-wide text-destructive">
                Contraindicated Actions
              </h4>
              <ul className="space-y-2.5">
                {report.contraindicated_actions.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground">
                      <X className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 5. CONDITIONAL PRECAUTIONS */}
        <section className="mt-7">
          <h3 className="text-lg font-black text-foreground">Precautions &amp; Symptom Tracking</h3>
          <div className="mt-3 rounded-2xl border-2 border-border bg-card p-5">
              <ul className="space-y-3 text-[15px] leading-relaxed text-foreground">
                {report.precautions.map((precaution: string, idx: number) => (
                  <li key={idx} className="flex gap-2.5">
                    <span className={`font-black ${risk === 'high' || risk === 'critical' ? 'text-destructive' : 'text-primary'}`}>
                      {idx + 1}.
                    </span>
                    {precaution}
                  </li>
                ))}
              </ul>
          </div>
        </section>

        {/* 6. REGULATORY & MEDICAL LEGAL DISCLAIMER */}
        <p className="mt-8 text-[11px] italic leading-relaxed text-muted-foreground">
          Disclaimer: This output constitutes an automated digital triage summary
          generated from preliminary user input data. It is not an active substitute
          for formal, in-person diagnostic evaluation or clinical treatment from a
          certified healthcare professional.
        </p>

        {/* 7. CARE NAVIGATION ACTIONS */}
        <section className="mt-7">
          <h3 className="text-lg font-black text-foreground">Find Care Near You</h3>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/camps" })}
              className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left transition active:scale-[0.98] active:bg-muted"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary/15 text-secondary">
                <Landmark className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-foreground">Government Hospitals &amp; Camps</p>
                <p className="text-xs font-semibold text-muted-foreground">Check availability and free health camps</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowPrivateHospitals((s) => !s)}
              className="flex items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left transition active:scale-[0.98] active:bg-muted"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Hospital className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-foreground">Best Private Hospitals</p>
                <p className="text-xs font-semibold text-muted-foreground">Top-rated private care options nearby</p>
              </div>
            </button>
          </div>

          {showPrivateHospitals && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">Sorted by top rated</p>
                <span className="text-xs font-semibold text-muted-foreground">Bangalore area</span>
              </div>
              {PRIVATE_HOSPITALS.map((h) => (
                <HospitalCard key={h.name} hospital={h} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HospitalCard({ hospital }: { hospital: (typeof PRIVATE_HOSPITALS)[number] }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Hospital className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-extrabold leading-snug text-foreground">{hospital.name}</h3>
          <p className="text-xs font-semibold text-muted-foreground">{hospital.specialty}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-success/10 px-2 py-1 text-xs font-black text-success">
          <Star className="h-3.5 w-3.5 fill-current" />
          {hospital.rating}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          {hospital.address} · {hospital.distance}
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4 text-primary" />
          {hospital.phone}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => toast.success("Opening directions", { description: hospital.name })}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow active:scale-[0.99]"
        >
          <Navigation className="h-4 w-4" />
          Directions
        </button>
        <button
          type="button"
          onClick={() => toast.success("Calling hospital", { description: hospital.phone })}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card py-3 text-sm font-bold text-foreground active:bg-muted"
        >
          <Phone className="h-4 w-4" />
          Call Now
        </button>
      </div>
    </div>
  );
}

function AudioToggle() {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    setPlaying(true);
    toast("Playing audio summary", { description: "Reading the report aloud" });
    timer.current = setTimeout(() => setPlaying(false), 4000);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "Pause audio" : "Play audio summary"}
      className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow active:scale-95"
    >
      {playing ? <Pause className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </button>
  );
}
