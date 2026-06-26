import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ShieldCheck, Delete } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/language";

import { useAuth } from "@/lib/auth";

type OtpSearch = { phone?: string };

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>): OtpSearch => ({
    phone: typeof search.phone === "string" ? search.phone : undefined,
  }),
  head: () => ({
    meta: [{ title: "Verify OTP" }],
  }),
  component: VerifyOtpPage,
});

const OTP_LENGTH = 6;

function VerifyOtpPage() {
  const { phone } = Route.useSearch();
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const { verifyOtp } = useAuth();
  const { t } = useTranslation();
  const submitted = useRef(false);

  const value = digits.join("");
  const isComplete = value.length === OTP_LENGTH;

  useEffect(() => {
    const performVerification = async () => {
      if (isComplete && !submitted.current) {
        submitted.current = true;
        setVerifying(true);
        try {
          const res = await verifyOtp(phone || "", value);
          toast.success("Verified successfully!");
          
          if (res.registered) {
            navigate({ to: "/home" });
          } else {
            navigate({ to: "/register", search: { phone } });
          }
        } catch (err: any) {
          toast.error(err.detail || err.message || "Invalid OTP. Please try again.");
          // Reset pin code state on error
          setDigits(Array(OTP_LENGTH).fill(""));
          submitted.current = false;
          setVerifying(false);
        }
      }
    };
    
    performVerification();
  }, [isComplete, navigate, phone, value, verifyOtp]);

  const press = (d: string) => {
    if (submitted.current) return;
    setDigits((prev) => {
      const next = [...prev];
      const i = next.findIndex((x) => x === "");
      if (i === -1) return prev;
      next[i] = d;
      return next;
    });
  };

  const backspace = () => {
    if (submitted.current) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== "") {
          next[i] = "";
          break;
        }
      }
      return next;
    });
  };

  const keys: (string | "back")[] = ["1","2","3","4","5","6","7","8","9","","0","back"];

  return (
    <main className="flex min-h-dvh flex-col bg-background px-5 pt-4 pb-6">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Link
          to="/login"
          className="-ml-2 inline-flex h-12 w-12 items-center justify-center rounded-full text-foreground hover:bg-muted"
          aria-label={t("back")}
        >
          <ChevronLeft className="h-7 w-7" />
        </Link>

        <div className="mt-4 flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">{t("enter_otp")}</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("sent_to")} <span className="font-semibold text-foreground">+91 {phone ?? "----- -----"}</span>
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {digits.map((d, i) => {
            const active = !d && i === digits.findIndex((x) => x === "");
            return (
              <div
                key={i}
                className={cn(
                  "grid h-14 w-12 place-items-center rounded-xl border-2 text-2xl font-bold text-foreground",
                  d
                    ? "border-primary bg-primary/5"
                    : active
                      ? "border-primary"
                      : "border-border bg-card"
                )}
              >
                {d || (active ? <span className="h-6 w-0.5 animate-pulse bg-primary" /> : "")}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {verifying ? t("loading") : ""}
        </p>

        <div className="mt-auto pt-6">
          <div className="grid grid-cols-3 gap-3">
            {keys.map((k, i) => {
              if (k === "") return <div key={i} />;
              if (k === "back") {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={backspace}
                    className="grid h-16 place-items-center rounded-2xl border-2 border-border bg-card text-foreground active:scale-[0.97] active:bg-muted"
                    aria-label="Backspace"
                  >
                    <Delete className="h-6 w-6" />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => press(k)}
                  className="grid h-16 place-items-center rounded-2xl border-2 border-border bg-card text-2xl font-bold text-foreground active:scale-[0.97] active:bg-muted"
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}