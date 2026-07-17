import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import ProfilePageClient from "./profile-page-client";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  try {
    const user = await prisma.user.findFirst({
      where: { handle: handle.toLowerCase(), status: "ACTIVE" },
      select: {
        handle: true,
        displayName: true,
        name: true,
        bio: true,
        image: true,
        isPrivate: true,
      },
    });
    if (!user) {
      return { title: "Profile", robots: { index: false } };
    }
    const name = user.displayName || user.name || user.handle || "Member";
    const title = `${name} (@${user.handle})`;
    const description =
      user.bio?.slice(0, 160) ||
      `${name} on Relune — presence, beautifully shared.`;
    return {
      title,
      description,
      robots: user.isPrivate ? { index: false, follow: false } : { index: true, follow: true },
      openGraph: {
        title,
        description,
        type: "profile",
        url: `${site.url}/u/${user.handle}`,
        ...(user.image ? { images: [{ url: user.image }] } : {}),
      },
      twitter: {
        card: user.image ? "summary" : "summary_large_image",
        title,
        description,
        ...(user.image ? { images: [user.image] } : {}),
      },
      alternates: { canonical: `/u/${user.handle}` },
    };
  } catch {
    return { title: "Profile" };
  }
}

export default function ProfilePage() {
  return <ProfilePageClient />;
}
