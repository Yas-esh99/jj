import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Hospital as HospitalIcon,
  Star,
  MapPin,
  Phone,
  Navigation,
  BadgeCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { SosButton } from "@/components/sos-button";
import { fetchHospitals, Hospital } from "@/lib/api";
import { useTranslation } from "@/lib/language";

export const Route = createFileRoute("/hospitals")({
  head: () => ({ meta: [{ title: "Nearby Hospitals" }] }),
  component: HospitalsPage,
});

function HospitalsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: hospitals = [], isLoading, error } = useQuery<Hospital[]>({
    queryKey: ["hospitals"],
    queryFn: fetchHospitals,
  });

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="-ml-1 flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-bold text-foreground active:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            {t("back")}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-5 pt-5">
        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary">
          <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.75} />
          {isLoading ? t("loading") : `${hospitals.length} ${t("find_hospital")}`}
        </div>

        <header className="mt-3">
          <h1 className="text-2xl font-black text-foreground">{t("find_hospital_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("hospital_subtitle")}
          </p>
        </header>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">Sorted by rating</p>
          <span className="text-xs font-semibold text-muted-foreground">Empanelled List</span>
        </div>

        <div className="mt-3 space-y-3">
          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">{t("loading")}</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border-2 border-border bg-card p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium text-destructive">Failed to load hospitals.</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="rounded-2xl border-2 border-border bg-card p-6 text-center text-muted-foreground">
              <p className="text-sm font-medium">No hospitals found in database.</p>
            </div>
          ) : (
            hospitals.map((h) => (
              <HospitalCard key={h.id} hospital={h} />
            ))
          )}
        </div>
      </div>

      <SosButton />
      <BottomNav />
    </div>
  );
}

function HospitalCard({ hospital }: { hospital: Hospital }) {
  const { t } = useTranslation();
  const handleDirections = () => {
    toast.success("Opening map directions", { description: hospital.name });
    if (hospital.google_map_direction_link) {
      window.open(hospital.google_map_direction_link, "_blank");
    } else {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(hospital.name + " " + hospital.address)}`, "_blank");
    }
  };

  const handleCall = () => {
    toast.success("Calling hospital", { description: hospital.number });
    window.open(`tel:${hospital.number}`, "_self");
  };

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <HospitalIcon className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-extrabold leading-snug text-foreground">{hospital.name}</h3>
            {hospital.is_govt && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                Govt
              </span>
            )}
            {hospital.ayushman_active && (
              <span className="rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-bold text-secondary uppercase">
                PM-JAY
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground line-clamp-2">
            Cures: {hospital.all_disease_it_cures.slice(0, 3).join(", ")}
            {hospital.all_disease_it_cures.length > 3 && "..."}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-success/10 px-2 py-1 text-xs font-black text-success">
          <Star className="h-3.5 w-3.5 fill-current" />
          {hospital.rating.toFixed(1)}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="leading-snug">{hospital.address}</span>
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4 shrink-0 text-primary" />
          <span>{hospital.number}</span>
        </p>
        <div className="flex gap-4 text-xs font-bold text-muted-foreground pt-1.5 border-t border-dashed border-border mt-2">
          <span>{t("beds_available")}: <span className="text-foreground font-black">{hospital.beds_available}</span></span>
          <span>{t("emergency")}: <span className={hospital.emergency_24x7 ? "text-success font-black" : "text-muted-foreground font-black"}>{hospital.emergency_24x7 ? "24x7" : "No"}</span></span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDirections}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow active:scale-[0.99]"
        >
          <Navigation className="h-4 w-4" />
          {t("directions")}
        </button>
        <button
          type="button"
          onClick={handleCall}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-card py-3 text-sm font-bold text-foreground active:bg-muted"
        >
          <Phone className="h-4 w-4" />
          {t("call_now")}
        </button>
      </div>
    </div>
  );
}
