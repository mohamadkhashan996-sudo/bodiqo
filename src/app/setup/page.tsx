import { SetupWizard } from "@/components/setup-wizard";

export const metadata = {
  title: "Setup",
  robots: { index: false, follow: false },
};

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070707] px-5 py-16">
      <div className="w-full">
        <p className="mb-6 text-center font-[family-name:var(--font-display)] text-3xl tracking-[0.28em] text-[#f3efe6]">
          BODIQO
        </p>
        <SetupWizard />
      </div>
    </div>
  );
}
