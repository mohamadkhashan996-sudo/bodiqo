"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Bookmark,
  Heart,
  MessageCircle,
  Music2,
  Share2,
} from "lucide-react";
import { OfficialBadge } from "@/components/brand/official-badge";

const REELS = [
  {
    id: "1",
    handle: "relune",
    name: "RELUNE",
    caption: "Presence, beautifully shared.",
    likes: "128K",
    comments: "4.2K",
    shares: "18.6K",
    music: "Original audio · RELUNE",
    official: true,
    avatar: "/brand/mark.png",
    scene: {
      base: "linear-gradient(165deg, #071412 0%, #0f3d38 28%, #1f9b8e 55%, #d98a4e 82%, #12141a 100%)",
      accent:
        "radial-gradient(circle at 70% 28%, rgba(255,255,255,0.28), transparent 34%)",
    },
  },
  {
    id: "2",
    handle: "maya.lens",
    name: "Maya Lens",
    caption: "Golden hour from the rooftop.",
    likes: "84.1K",
    comments: "2.9K",
    shares: "9.4K",
    music: "Soft Orbit · Studio Relune",
    official: false,
    avatar: null,
    scene: {
      base: "linear-gradient(168deg, #120e18 0%, #243846 34%, #8a6a4a 62%, #d98a4e 84%, #0a0c10 100%)",
      accent:
        "radial-gradient(circle at 32% 22%, rgba(255,220,180,0.35), transparent 36%)",
    },
  },
  {
    id: "3",
    handle: "atlas.studio",
    name: "Atlas Studio",
    caption: "A quieter kind of close.",
    likes: "61.8K",
    comments: "1.7K",
    shares: "6.1K",
    music: "Night Signal · RELUNE",
    official: false,
    avatar: null,
    scene: {
      base: "linear-gradient(158deg, #0a1218 0%, #14363a 36%, #157a6f 58%, #c58a2d 86%, #12141a 100%)",
      accent:
        "radial-gradient(circle at 60% 18%, rgba(180,240,230,0.22), transparent 40%)",
    },
  },
] as const;

export function PhoneReelPreview() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartBurst, setHeartBurst] = useState(false);
  const reel = REELS[index] ?? REELS[0]!;

  useEffect(() => {
    if (reduce) {
      setProgress(68);
      return;
    }
    setProgress(0);
    setLiked(false);
    setSaved(false);
    const started = performance.now();
    const duration = 5600;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(100, ((now - started) / duration) * 100);
      setProgress(next);
      if (next < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        setIndex((current) => (current + 1) % REELS.length);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, reduce]);

  function advance() {
    setIndex((current) => (current + 1) % REELS.length);
  }

  function onDoubleTapLike() {
    if (!liked) {
      setLiked(true);
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 700);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-[min(21.5rem,100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 -z-10 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--signal)_26%,transparent),transparent_70%)] blur-3xl"
      />

      {/* Phone shell */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.05, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Side buttons */}
        <div
          aria-hidden
          className="absolute top-[18%] -left-[3px] h-10 w-[3px] rounded-l-full bg-[#2a2e36]"
        />
        <div
          aria-hidden
          className="absolute top-[28%] -left-[3px] h-16 w-[3px] rounded-l-full bg-[#2a2e36]"
        />
        <div
          aria-hidden
          className="absolute top-[24%] -right-[3px] h-20 w-[3px] rounded-r-full bg-[#2a2e36]"
        />

        <div className="relative overflow-hidden rounded-[2.75rem] bg-[#0b0d12] p-[10px] shadow-[var(--shadow-xl)] ring-1 ring-white/15">
          <div className="relative aspect-[9/19.2] overflow-hidden rounded-[2.2rem] bg-[var(--night)]">
            {/* Dynamic Island */}
            <div className="absolute inset-x-0 top-0 z-30 flex justify-center pt-3">
              <div className="h-7 w-[7.25rem] rounded-full bg-black shadow-inner" />
            </div>

            {/* Progress segments */}
            <div className="absolute inset-x-4 top-12 z-30 flex gap-1.5">
              {REELS.map((item, i) => (
                <div
                  key={item.id}
                  className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/25"
                >
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                    style={{
                      width:
                        i < index
                          ? "100%"
                          : i === index
                            ? `${progress}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Next reel"
              onClick={advance}
              onDoubleClick={onDoubleTapLike}
              className="absolute inset-0 z-10 cursor-pointer"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={reel.id}
                initial={reduce ? false : { opacity: 0.2, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
                style={{ background: reel.scene.base }}
              >
                <div
                  className="absolute inset-0"
                  style={{ background: reel.scene.accent }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.28)_0%,transparent_22%,transparent_52%,rgba(0,0,0,0.82)_100%)]" />

                {/* Cinematic light streaks */}
                {!reduce ? (
                  <>
                    <motion.div
                      className="absolute top-[12%] -left-1/4 h-[55%] w-[70%] rotate-12 rounded-full bg-white/10 blur-3xl"
                      animate={{ x: [0, 36, 0], opacity: [0.35, 0.55, 0.35] }}
                      transition={{
                        duration: 7.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      className="absolute right-[-10%] bottom-[18%] h-40 w-40 rounded-full bg-[var(--ember)]/25 blur-3xl"
                      animate={{ y: [0, -18, 0], scale: [1, 1.08, 1] }}
                      transition={{
                        duration: 6.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </>
                ) : null}

                {/* Soft horizon / scene geometry */}
                <div className="absolute inset-x-[-10%] bottom-[22%] h-[38%] rounded-[100%] bg-black/25 blur-2xl" />
                <div className="absolute top-[34%] left-[12%] h-24 w-24 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm" />
                <div className="absolute top-[42%] right-[16%] h-16 w-16 rounded-full border border-white/10 bg-white/8" />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {heartBurst ? (
                <motion.div
                  key="burst"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.3 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute inset-0 z-40 grid place-items-center"
                >
                  <Heart
                    className="size-20 text-[#ff5d6c]"
                    fill="currentColor"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Top chrome */}
            <div className="pointer-events-none absolute inset-x-0 top-[3.4rem] z-20 flex items-center justify-center gap-8 text-[11px] font-semibold tracking-[0.2em] text-white/85 uppercase">
              <span>Following</span>
              <span className="relative text-white">
                For You
                <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white" />
              </span>
            </div>

            {/* Bottom UI */}
            <div className="absolute inset-x-0 bottom-0 z-20 p-5 pb-8 text-white">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-11 overflow-hidden rounded-[1.05rem] border-2 border-white/65 bg-[var(--ink)] shadow-[var(--shadow-sm)]">
                      {reel.avatar ? (
                        <Image
                          src={reel.avatar}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-sm font-bold">
                          {reel.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[13px] font-semibold tracking-wide">
                          @{reel.handle}
                        </p>
                        {reel.official ? (
                          <OfficialBadge className="size-4" />
                        ) : (
                          <BadgeCheck
                            className="size-4 text-[var(--signal)]"
                            aria-label="Verified"
                          />
                        )}
                      </div>
                      <p className="truncate text-xs font-medium text-white/90">
                        {reel.name}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3.5 max-w-[14.5rem] text-[13px] leading-6 text-white">
                    {reel.caption}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-white/90">
                    <Music2 className="size-3.5 shrink-0" />
                    <span className="truncate">{reel.music}</span>
                  </div>
                </div>

                <div className="relative z-30 flex shrink-0 flex-col items-center gap-3.5 pb-1">
                  <Action
                    label={liked ? "Unlike" : "Like"}
                    count={liked ? "128K+" : reel.likes}
                    onClick={() => {
                      setLiked((v) => !v);
                      if (!liked) {
                        setHeartBurst(true);
                        window.setTimeout(() => setHeartBurst(false), 700);
                      }
                    }}
                  >
                    <Heart
                      className="size-[1.35rem]"
                      fill={liked ? "currentColor" : "none"}
                      style={{ color: liked ? "#ff5d6c" : "white" }}
                    />
                  </Action>
                  <Action label="Comments" count={reel.comments}>
                    <MessageCircle className="size-[1.35rem]" />
                  </Action>
                  <Action label="Share" count={reel.shares}>
                    <Share2 className="size-[1.35rem]" />
                  </Action>
                  <Action
                    label={saved ? "Unsave" : "Save"}
                    onClick={() => setSaved((v) => !v)}
                  >
                    <Bookmark
                      className="size-[1.35rem]"
                      fill={saved ? "currentColor" : "none"}
                    />
                  </Action>
                </div>
              </div>

              {/* Home indicator */}
              <div className="mx-auto mt-5 h-1 w-28 rounded-full bg-white/45" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Action({
  children,
  label,
  count,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  count?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="group flex flex-col items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white transition active:scale-95"
    >
      <span className="grid size-11 place-items-center rounded-full border-2 border-white/70 bg-[rgba(12,14,20,0.72)] shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-md transition group-hover:scale-105 group-hover:border-white group-hover:bg-[rgba(20,24,34,0.88)]">
        {children}
      </span>
      {count ? <span className="tabular-nums">{count}</span> : null}
    </button>
  );
}
