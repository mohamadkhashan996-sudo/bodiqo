import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Clapperboard,
  Lock,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const PhoneReelPreview = dynamic(
  () =>
    import("@/components/marketing/phone-reel-preview").then(
      (m) => m.PhoneReelPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="mx-auto aspect-[9/19] w-full max-w-[min(21.5rem,100%)] rounded-[2.5rem] bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
      />
    ),
  },
);

const FEATURES = [
  {
    icon: Clapperboard,
    title: "Immersive reels",
    body: "Vertical stories with cinema pacing, soft motion, and interactions that feel native to the hand.",
  },
  {
    icon: ShieldCheck,
    title: "Trust by default",
    body: "Secure sessions, privacy controls, and production-grade safeguards woven into the experience.",
  },
  {
    icon: UsersRound,
    title: "Quiet community",
    body: "Spaces for creators and circles — without the noise, clutter, or algorithmic chaos.",
  },
] as const;

const HIGHLIGHTS = [
  { icon: Sparkles, label: "Cinematic media" },
  { icon: Lock, label: "Privacy-first" },
  { icon: UsersRound, label: "Creator ready" },
] as const;

export default function LandingPage() {
  return (
    <main id="main" className="relative">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_8%_-12%,color-mix(in_srgb,var(--signal)_24%,transparent),transparent_58%),radial-gradient(ellipse_50%_48%_at_96%_4%,color-mix(in_srgb,var(--ember)_18%,transparent),transparent_52%),linear-gradient(180deg,#faf8f4_0%,var(--cloud)_52%,color-mix(in_srgb,var(--mist)_28%,var(--cloud))_100%)]" />
          <div className="absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_srgb,var(--ink)_3.5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--ink)_3.5%,transparent)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_40%_30%,black_15%,transparent_72%)] [background-size:80px_80px] opacity-[0.28]" />
          <div className="landing-blob landing-blob-signal absolute top-[18%] left-[-8%] h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--signal)_18%,transparent)] blur-3xl motion-reduce:animate-none" />
          <div className="landing-blob landing-blob-ember absolute top-[42%] right-[-4%] h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--ember)_14%,transparent)] blur-3xl motion-reduce:animate-none" />
        </div>

        <div className="section-shell relative grid min-h-0 items-center gap-10 px-4 pt-6 pb-14 sm:min-h-[calc(100svh-7.5rem)] sm:gap-12 sm:px-5 sm:pt-8 sm:pb-16 md:gap-16 md:px-8 md:pt-12 md:pb-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-20">
          <div className="flex max-w-2xl flex-col justify-center lg:max-w-none lg:pr-4">
            <p className="landing-reveal font-[family-name:var(--font-display)] text-[clamp(4.25rem,12vw,8.5rem)] leading-[0.84] font-semibold tracking-[-0.05em] text-[var(--ink)]">
              RELUNE
            </p>

            <h1 className="landing-reveal landing-reveal-delay-1 mt-8 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(2.1rem,4vw,3.5rem)] leading-[1.08] font-medium tracking-[-0.035em] text-[var(--ink)]">
              Presence, beautifully shared.
            </h1>

            <p className="landing-reveal landing-reveal-delay-2 mt-7 max-w-[32rem] text-[1.05rem] leading-8 text-[var(--muted)] md:text-lg md:leading-[1.75]">
              A cinematic social platform for creators, communities, and private
              conversation — calm by design, premium in every detail.
            </p>

            <div className="landing-reveal landing-reveal-delay-3 mt-12 flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <Link
                href="/sign-up"
                className="landing-cta-primary inline-flex min-h-[3.55rem] w-full items-center justify-center rounded-[1.3rem] border-2 border-[var(--ink)] px-9 text-[0.9375rem] font-semibold tracking-[0.01em] text-white sm:w-auto"
              >
                Create Account
              </Link>
              <Link
                href="/home"
                className="landing-cta-secondary inline-flex min-h-[3.55rem] w-full items-center justify-center rounded-[1.3rem] px-9 text-[0.9375rem] font-semibold tracking-[0.01em] sm:w-auto"
              >
                Continue as Guest
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:pt-2">
            <PhoneReelPreview />
          </div>
        </div>
      </section>

      <section className="section-shell px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker">Designed for stillness</p>
          <h2 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.15rem,4.2vw,3.75rem)] leading-[1.06] tracking-[-0.035em]">
            Every surface feels intentional.
            <br className="hidden sm:block" /> Every interaction feels
            inevitable.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-[1.05rem]">
            RELUNE pairs cinematic media with privacy-first architecture —
            reels, profiles, messaging, and communities in one refined product.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="group glass-strong rounded-[2.1rem] p-8 shadow-[var(--shadow-md)] transition-[box-shadow,transform] duration-[var(--duration)] hover:-translate-y-2 hover:shadow-[var(--shadow-lg)] motion-reduce:transform-none"
            >
              <div className="grid size-12 place-items-center rounded-[1.2rem] bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)] transition duration-[var(--duration)] group-hover:bg-[var(--signal)] group-hover:text-white">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-7 font-[family-name:var(--font-display)] text-[1.65rem] tracking-tight">
                {title}
              </h3>
              <p className="mt-3.5 text-sm leading-7 text-[var(--muted)]">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell px-5 pb-24 md:px-8 md:pb-32">
        <div className="relative overflow-hidden rounded-[2rem] bg-[var(--night)] px-5 py-12 text-[var(--cloud)] shadow-[var(--shadow-xl)] sm:rounded-[2.5rem] sm:px-8 sm:py-14 md:px-16 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,color-mix(in_srgb,var(--signal)_38%,transparent),transparent_48%),radial-gradient(ellipse_at_92%_100%,color-mix(in_srgb,var(--ember)_30%,transparent),transparent_42%)]"
          />
          <div className="relative grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold tracking-[0.24em] text-[var(--signal)] uppercase">
                Begin anywhere
              </p>
              <h2 className="mt-5 max-w-xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,4.2vw,3.75rem)] leading-[1.04] tracking-[-0.035em]">
                Browse as a guest. Belong when you are ready.
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/90 md:text-base md:leading-8">
                Explore public reels, profiles, and conversations instantly.
                Create an account when you want to like, comment, follow, or
                message.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3.5 sm:flex-row sm:flex-wrap lg:flex-col lg:items-stretch">
              <Link
                href="/home"
                className="inline-flex min-h-[3.55rem] w-full items-center justify-center gap-2 rounded-[1.3rem] border-2 border-white bg-white px-6 text-[0.9375rem] font-semibold text-[var(--night)] shadow-[var(--shadow-md)] transition duration-[var(--duration)] ease-[var(--ease-out)] hover:-translate-y-1 hover:bg-[var(--cloud-elevated)] hover:shadow-[var(--shadow-lg)] motion-reduce:transform-none sm:w-auto sm:px-8 lg:w-full"
              >
                Enter as Guest
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex min-h-[3.55rem] w-full items-center justify-center rounded-[1.3rem] border-2 border-white bg-[rgba(12,14,20,0.55)] px-6 text-[0.9375rem] font-semibold text-white shadow-[var(--shadow-md)] backdrop-blur-md transition duration-[var(--duration)] ease-[var(--ease-out)] hover:-translate-y-1 hover:bg-[rgba(12,14,20,0.72)] motion-reduce:transform-none sm:w-auto sm:px-8 lg:w-full"
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="relative mt-14 grid gap-4 border-t border-white/35 pt-10 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[1.4rem] border-2 border-white/55 bg-[rgba(12,14,20,0.45)] px-5 py-4 backdrop-blur-md"
              >
                <Icon
                  className="size-4 text-[var(--signal)]"
                  strokeWidth={1.75}
                />
                <span className="text-sm font-semibold text-white">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
