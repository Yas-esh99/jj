import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Upload, FileCheck } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/upload-report")({
  head: () => ({ meta: [{ title: "Upload Report" }] }),
  component: UploadReportPage,
});

function UploadReportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    if (selected) {
      toast("Report selected", { description: selected.name });
    }
  };

  const handleSubmit = () => {
    if (!file) {
      toast.error("Please select a report first");
      return;
    }
    toast("Report submitted", { description: `${file.name} is being processed.` });
    setTimeout(() => navigate({ to: "/home" }), 1200);
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-md px-5 pt-4">
        {/* Header */}
        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground active:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upload Only
          </p>
          <h1 className="mt-1 text-2xl font-black text-foreground">Upload Report</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Select a medical report or ID to upload.
          </p>
        </div>

        {/* File selection area */}
        <div className="mt-8">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Select report file"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-border bg-card p-10 text-center transition active:scale-[0.98] active:bg-muted"
          >
            <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
              {file ? <FileCheck className="h-9 w-9" /> : <Upload className="h-9 w-9" />}
            </span>
            <span className="text-lg font-bold text-foreground">
              {file ? file.name : "Tap to select a file"}
            </span>
            <span className="text-sm text-muted-foreground">
              Images or PDFs up to 10 MB
            </span>
          </button>
        </div>

        {/* Submit button */}
        <div className="mt-6">
          <Button
            onClick={handleSubmit}
            className="h-16 w-full rounded-2xl bg-secondary text-lg font-bold text-secondary-foreground hover:bg-secondary/90"
          >
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
}
