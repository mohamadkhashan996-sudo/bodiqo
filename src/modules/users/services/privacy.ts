import { Prisma, PrivacyAudience } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const fields = [
  "whoCanFollow", "whoCanMessage", "whoCanCall", "whoCanComment", "whoCanMention",
  "whoCanTag", "whoCanSeeStories", "whoCanSeeActivity", "whoCanSeeOnline",
  "showReadReceipts", "showTyping",
] as const;

export type PrivacyInput = Partial<{
  whoCanFollow: PrivacyAudience; whoCanMessage: PrivacyAudience; whoCanCall: PrivacyAudience;
  whoCanComment: PrivacyAudience; whoCanMention: PrivacyAudience; whoCanTag: PrivacyAudience;
  whoCanSeeStories: PrivacyAudience; whoCanSeeActivity: PrivacyAudience; whoCanSeeOnline: PrivacyAudience;
  showReadReceipts: boolean; showTyping: boolean;
}>;

export function getPrivacy(userId: string) {
  return prisma.privacySettings.upsert({ where: { userId }, create: { userId }, update: {} });
}

export function updatePrivacy(userId: string, input: PrivacyInput) {
  const data: Prisma.PrivacySettingsUncheckedUpdateInput = {};
  for (const field of fields) {
    const value = input[field];
    if (value !== undefined) Object.assign(data, { [field]: value });
  }
  const createData: Prisma.PrivacySettingsUncheckedCreateInput = { userId };
  Object.assign(createData, data);
  return prisma.privacySettings.upsert({
    where: { userId },
    create: createData,
    update: data,
  });
}
