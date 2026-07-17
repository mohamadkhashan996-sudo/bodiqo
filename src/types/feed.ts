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

/** Client-side post shape returned by serializePost / feed APIs. */
export type FeedPost = {
  id: string;
  body?: string | null;
  type?: string;
  status?: string;
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
  bookmarked?: boolean;
  isPinned?: boolean;
  publishedAt?: string | Date;
  scheduledAt?: string | Date | null;
  createdAt?: string | Date;
  media?: FeedMedia[];
  author?: FeedAuthor;
  poll?: FeedPoll | null;
  hashtags?: HashtagSummary[];
};

export type FeedComment = {
  id: string;
  body: string;
  author?: FeedAuthor;
};

export type HashtagSummary = {
  id: string;
  tag: string;
  postCount: number;
};

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
