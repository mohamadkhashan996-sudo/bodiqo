"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";

export function StoriesRail() {
  const [stories, setStories] = useState<any[]>([]); const [active, setActive] = useState<any>(null);
  useEffect(() => { fetch("/api/stories").then((r) => r.json()).then((d) => setStories(d.stories ?? [])).catch(() => {}); }, []);
  return <><div className="flex gap-4 overflow-x-auto pb-2">{stories.map((story) => <motion.button whileHover={{ y: -3 }} key={story.id} onClick={() => setActive(story)} className="w-16 shrink-0 text-center"><span className="block rounded-[1.25rem] bg-gradient-to-br from-[var(--signal)] to-[var(--ember)] p-0.5"><Avatar src={story.author?.image} name={story.author?.displayName ?? story.author?.name} className="size-14 rounded-[1.1rem] border-2 border-[var(--cloud)]" /></span><span className="mt-1 block truncate text-[10px] text-[var(--muted)]">{story.author?.handle ?? "Story"}</span></motion.button>)}</div><Modal open={Boolean(active)} onClose={() => setActive(null)} title={active?.author?.displayName ?? "Story"}>{active?.mediaKind === "VIDEO" ? <video src={active.mediaUrl} controls autoPlay className="w-full rounded-2xl" /> : <img src={active?.mediaUrl} alt="" className="w-full rounded-2xl" />}<p className="mt-3">{active?.textOverlay}</p></Modal></>;
}
