"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Lock,
  Sparkles,
  UsersRound,
  Clapperboard,
  ShieldCheck,
} from "lucide-react";
import { PhoneReelPreview } from "@/components/marketing/phone-reel-preview";
import { AnimatedSection } from "@/components/motion/primitives";

const ease = [0.22, 1, 0.36, 1] as const;

export default function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <main id="main" className="relative">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_60%_at_8%_-12%,color-mix(in_srgb,var(--signal)_24%,transparent),transparent_58%),radial-gradient(ellipse_50%_48%_at_96%_4%,color-mix(in_srgb,var(--ember)_18%,transparent),transparent_52%),linear-gradient(180deg,#faf8f4_0%,var(--cloud)_52%,color-mix(in_srgb,var(--mist)_28%,var(--cloud))_100%)]" />
          <div className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(to_right,color-mix(in_srgb,var(--ink)_3.5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--ink)_3.5%,transparent)_1px,transparent_1px)] [background-size:80px_80px] [mask-image:radial-gradient(ellipse_at_40%_30%,black_15%,transparent_72%)]" />
          {!reduce ? (
            <>
              <motion.div
                className="absolute left-[-8%] top-[18%] h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--signal)_18%,transparent)] blur-3xl"
                animate={{ x: [0, 24, 0], y: [0, 16, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute right-[-4%] top-[42%] h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--ember)_14%,transparent)] blur-3xl"
                animate={{ x: [0, -20, 0], y: [0, -14, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          ) : null}
        </div>

        <div className="section-shell relative grid min-h-[calc(100svh-7.5rem)] items-center gap-12 px-5 pb-16 pt-8 md:gap-16 md:px-8 md:pb-24 md:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-20">
          <div className="flex max-w-2xl flex-col justify-center lg:max-w-none lg:pr-4">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease }}
              className="font-[family-name:var(--font-display)] text-[clamp(4.25rem,12vw,8.5rem)] font-semibold leading-[0.84] tracking-[-0.05em] text-[var(--ink)]"
            >
              RELUNE
            </motion.p>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.1, ease }}
              className="mt-8 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(2.1rem,4vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.035em] text-[var(--ink)]"
            >
              Presence, beautifully shared.
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.18, ease }}
              className="mt-7 max-w-[32rem] text-[1.05rem] leading-8 text-[var(--muted)] md:text-lg md:leading-[1.75]"
            >
              A cinematic social platform for creators, communities, and private
              conversation — calm by design, premium in every detail.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.28, ease }}
              className="mt-12 flex flex-col gap-3.5 sm:flex-row sm:items-center"
            >
              <Link
                href="/sign-up"
                className="landing-cta-primary inline-flex min-h-[3.55rem] items-center justify-center rounded-[1.3rem] border-2 border-[var(--ink)] px-9 text-[0.9375rem] font-semibold tracking-[0.01em] text-white"
              >
                Create Account
              </Link>
              <Link
                href="/home"
                className="landing-cta-secondary inline-flex min-h-[3.55rem] items-center justify-center rounded-[1.3rem] px-9 text-[0.9375rem] font-semibold tracking-[0.01em]"
              >
                Continue as Guest
              </Link>
            </motion.div>
          </div>

          <div className="relative flex justify-center lg:justify-end lg:pt-2">
            <PhoneReelPreview />
          </div>
        </div>
      </section>

      <AnimatedSection className="section-shell px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="kicker">Designed for stillness</p>
          <h2 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2.15rem,4.2vw,3.75rem)] leading-[1.06] tracking-[-0.035em]">
            Every surface feels intentional.
            <br className="hidden sm:block" /> Every interaction feels inevitable.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-[1.05rem]">
            RELUNE pairs cinematic media with privacy-first architecture — reels,
            profiles, messaging, and communities in one refined product.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
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
          ].map(({ icon: Icon, title, body }) => (
            <motion.article
              key={title}
              whileHover={reduce ? undefined : { y: -8 }}
              transition={{ duration: 0.4, ease }}
              className="group glass-strong rounded-[2.1rem] p-8 shadow-[var(--shadow-md)] transition-[box-shadow] duration-[var(--duration)] hover:shadow-[var(--shadow-lg)]"
            >
              <div className="grid size-12 place-items-center rounded-[1.2rem] bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)] transition duration-[var(--duration)] group-hover:bg-[var(--signal)] group-hover:text-white">
                <Icon className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-7 font-[family-name:var(--font-display)] text-[1.65rem] tracking-tight">
                {title}
              </h3>
              <p className="mt-3.5 text-sm leading-7 text-[var(--muted)]">{body}</p>
            </motion.article>
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection className="section-shell px-5 pb-24 md:px-8 md:pb-32">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--night)] px-8 py-14 text-[var(--cloud)] shadow-[var(--shadow-xl)] md:px-16 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,color-mix(in_srgb,var(--signal)_38%,transparent),transparent_48%),radial-gradient(ellipse_at_92%_100%,color-mix(in_srgb,var(--ember)_30%,transparent),transparent_42%)]"
          />
          <div className="relative grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--signal)]">
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
            <div className="flex flex-col gap-3.5 sm:flex-row lg:flex-col lg:items-stretch">
              <Link
                href="/home"
                className="inline-flex min-h-[3.55rem] items-center justify-center gap-2 rounded-[1.3rem] border-2 border-white bg-white px-8 text-[0.9375rem] font-semibold text-[var(--night)] shadow-[var(--shadow-md)] transition duration-[var(--duration)] ease-[var(--ease-out)] hover:-translate-y-1 hover:bg-[var(--cloud-elevated)] hover:shadow-[var(--shadow-lg)]"
              >
                Enter as Guest
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex min-h-[3.55rem] items-center justify-center rounded-[1.3rem] border-2 border-white bg-[rgba(12,14,20,0.55)] px-8 text-[0.9375rem] font-semibold text-white shadow-[var(--shadow-md)] backdrop-blur-md transition duration-[var(--duration)] ease-[var(--ease-out)] hover:-translate-y-1 hover:bg-[rgba(12,14,20,0.72)]"
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="relative mt-14 grid gap-4 border-t border-white/35 pt-10 sm:grid-cols-3">
            {[
              { icon: Sparkles, label: "Cinematic media" },
              { icon: Lock, label: "Privacy-first" },
              { icon: UsersRound, label: "Creator ready" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[1.4rem] border-2 border-white/55 bg-[rgba(12,14,20,0.45)] px-5 py-4 backdrop-blur-md"
              >
                <Icon className="size-4 text-[var(--signal)]" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>
    </main>
  );
}
