export type ResourceType = "video" | "playlist" | "channel";
export type SortMode = "top" | "newest";

export type Resource = {
  id: string;
  type: ResourceType;
  youtube_id: string;
  youtube_url: string;
  canonical_url: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  channel_url: string | null;
  educational_reason: string | null;
  tags: string[];
  upvote_count: number;
  created_at: string;
};
