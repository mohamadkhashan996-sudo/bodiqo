export type FeedAuthor = {
  id?: string;
  handle?: string | null;
  name?: string | null;
  displayName?: string | null;
  image?: string | null;
  isVerified?: boolean;
  isOfficial?: boolean;
};

export type FeedMedia = {
  id?: string;
  url: string;
  kind?: string;
  thumbUrl?: string | null;
};

export type FeedPollOption = {
  id: string;
  label: string;
  voteCount: number;
  sortOrder?: number;
};

export type FeedPoll = {
  id: string;
  endsAt?: string | Date | null;
  totalVotes?: number;
  votedOptionId?: string | null;
  options: FeedPollOption[];
};

export type FeedReaction =
  | "LIKE"
  | "LOVE"
  | "LAUGH"
  | "WOW"
  | "SAD"
  | "ANGRY";

export type FeedReactionCounts = Record<FeedReaction, number>;

/** Client-side post shape returned by serializePost / feed APIs. */
export type FeedPost = {
  id: string;
  body?: string | null;
  type?: string;
  status?: string;
  visibility?: string;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  liked?: boolean;
  reaction?: FeedReaction | null;
  reactionCounts?: FeedReactionCounts;
  bookmarked?: boolean;
  isPinned?: boolean;
  publishedAt?: string | Date;
  scheduledAt?: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  media?: FeedMedia[];
  author?: FeedAuthor;
  poll?: FeedPoll | null;
  hashtags?: HashtagSummary[];
};

export type FeedComment = {
  id: string;
  postId?: string;
  parentId?: string | null;
  body: string;
  mediaUrl?: string | null;
  mediaKind?: string | null;
  likeCount?: number;
  liked?: boolean;
  reaction?: FeedReaction | null;
  isPinned?: boolean;
  edited?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  author?: FeedAuthor;
  replies?: FeedComment[];
  replyCount?: number;
};

export type HashtagSummary = {
  id: string;
  tag: string;
  postCount: number;
  recentCount?: number;
};

/** Client-safe post type strings (mirrors Prisma PostType without client Prisma). */
export type PostTypeName =
  "TEXT" | "IMAGE" | "VIDEO" | "SHORT" | "POLL" | "LINK" | "REPOST";
export type MediaKindName = "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "GIF";

export function isVideoPost(post: Pick<FeedPost, "type" | "media">) {
  if (post.type === "SHORT" || post.type === "VIDEO") return true;
  return (post.media ?? []).some((m) => m.kind === "VIDEO");
}

export type InterestItem = {
  id: string;
  name: string;
};

export type SuggestedUser = {
  id: string;
  handle: string | null;
  name: string | null;
  displayName: string | null;
  image: string | null;
};

export type PublicProfile = {
  id: string;
  handle: string | null;
  name?: string | null;
  displayName?: string | null;
  bio?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  languages?: string[];
  socialLinks?: Record<string, string> | null;
  image?: string | null;
  coverImage?: string | null;
  isVerified?: boolean;
  isOfficial?: boolean;
  isPrivate?: boolean;
  followersCount?: number | null;
  followingCount?: number | null;
  friendsCount?: number | null;
  mutualFriendsCount?: number | null;
  postsCount?: number | null;
  videosCount?: number | null;
  likesCount?: number | null;
  createdAt?: string | Date;
  interests?: Array<{ id: string; name: string; slug?: string }>;
  isFriend?: boolean;
  isBestFriend?: boolean;
  friendRelation?: "none" | "friends" | "outgoing" | "incoming";
  visibility?: {
    isPrivate?: boolean;
    canViewContent?: boolean;
    canViewFollowers?: boolean;
    canViewFollowing?: boolean;
    canViewFriends?: boolean;
    followStatus?: "none" | "following" | "requested";
    isMuted?: boolean;
    isBlockedByMe?: boolean;
  };
};
