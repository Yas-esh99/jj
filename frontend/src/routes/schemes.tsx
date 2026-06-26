import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  Upload,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileText,
  Activity,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { SosButton } from "@/components/sos-button";
import { fetchSchemes, Scheme } from "@/lib/api";
import { useTranslation } from "@/lib/language";

export const Route = createFileRoute("/schemes")({
  head: () => ({ meta: [{ title: "Government Schemes" }] }),
  component: SchemesPage,
});

function SchemesPage() {
  const [scanned, setScanned] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { data: schemes = [], isLoading, error } = useQuery<Scheme[]>({
    queryKey: ["schemes"],
    queryFn: fetchSchemes,
  });

  const runScan = () => {
    toast("Reading Ayushman Card...", { description: "Processing document details" });
    setTimeout(() => {
      setScanned(true);
      toast.success("Matches found", { description: "Schemes you are eligible for" });
    }, 1500);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) runScan();
  };

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-6">
        {/* Header */}
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Welfare</p>
          <h1 className="mt-1 text-2xl font-black text-foreground">{t("govt_schemes_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("schemes_subtitle")}
          </p>
        </header>

        {/* Simple Upload Card */}
        <div className="mt-6 rounded-3xl border-2 border-border bg-card p-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">{t("upload_ayushman")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDF or image format up to 5MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow active:scale-[0.99] transition-all"
            >
              {t("choose_document")}
            </button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
          </div>
        </div>

        {/* Matches Found Section */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-secondary" strokeWidth={2.5} />
            <h2 className="text-lg font-black text-foreground">{t("matched_schemes")}</h2>
            {scanned && !isLoading && (
              <span className="ml-auto rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary">
                {schemes.length} eligible
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex h-36 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">{t("loading")}</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border-2 border-border bg-card p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium text-destructive">Failed to load schemes.</p>
            </div>
          ) : !scanned ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center text-muted-foreground">
              <ShieldCheck className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-sm">
                Upload your health card to see matches.
              </p>
            </div>
          ) : schemes.length === 0 ? (
            <div className="rounded-2xl border-2 border-border bg-card p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium">No matching schemes in database.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {schemes.map((s) => (
                <SchemeCard key={s.id} scheme={s} />
              ))}
            </div>
          )}
        </section>
      </div>

      <SosButton />
      <BottomNav />
    </div>
  );
}

function SchemeCard({ scheme }: { scheme: Scheme }) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border-2 border-border bg-card p-5">
      <h3 className="text-base font-black leading-snug text-foreground">{scheme.name}</h3>

      {/* Eligibility Badge */}
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-[11px] font-extrabold text-secondary leading-snug">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2.75} />
        <span>Eligibility: {scheme.targetDemographic}</span>
      </div>

      {/* Required Documents */}
      {scheme.requiredDocuments && scheme.requiredDocuments.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> {t("required_docs")}
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-foreground">
            {scheme.requiredDocuments.map((d, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-primary">•</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Benefits */}
      {scheme.benefits && scheme.benefits.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> {t("scheme_benefits")}
          </p>
          <ul className="mt-1.5 space-y-1 text-sm text-foreground">
            {scheme.benefits.map((b, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-secondary">•</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Treated Diseases / Categories */}
      {scheme.eligibleCategories && scheme.eligibleCategories.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> {t("treated_categories")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {scheme.eligibleCategories.join(", ")}
          </p>
        </div>
      )}

      {/* Coverage Limit */}
      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {t("coverage_limit")}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground font-semibold">{scheme.coverageLimit}</p>
      </div>

      <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">{scheme.description}</p>

      <button
        type="button"
        onClick={() => toast.success("Starting application", { description: scheme.name })}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow active:scale-[0.99]"
      >
        {t("apply_now")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}
