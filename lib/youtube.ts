import type { ResourceType } from "./types";

type NormalizedYouTube = {
  type: ResourceType;
  youtube_id: string;
  canonical_url: string;
};

type YouTubeMetadata = {
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  channel_url: string | null;
};

const idPattern = /^[A-Za-z0-9_-]{2,}$/;

export function normalizeYouTubeUrl(input: string): NormalizedYouTube {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Paste a valid YouTube URL.");
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = parts[0];
    if (!id || !idPattern.test(id)) throw new Error("That YouTube video URL is missing a video id.");
    return {
      type: "video",
      youtube_id: id,
      canonical_url: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  if (host !== "youtube.com" && !host.endsWith(".youtube.com")) {
    throw new Error("Only YouTube links are supported.");
  }

  if (url.pathname === "/watch") {
    const videoId = url.searchParams.get("v");
    const listId = url.searchParams.get("list");
    if (videoId && idPattern.test(videoId)) {
      return {
        type: "video",
        youtube_id: videoId,
        canonical_url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }
    if (listId && idPattern.test(listId)) {
      return playlist(listId);
    }
  }

  if (url.pathname === "/playlist") {
    const listId = url.searchParams.get("list");
    if (listId && idPattern.test(listId)) return playlist(listId);
  }

  const [section, value] = parts;

  if (section?.startsWith("@") && section.length > 1) {
    const handle = decodeURIComponent(section.slice(1));
    if (idPattern.test(handle)) {
      return {
        type: "channel",
        youtube_id: `@${handle}`,
        canonical_url: `https://www.youtube.com/@${encodeURIComponent(handle)}`,
      };
    }
  }

  if (["channel", "c", "user"].includes(section) && value && idPattern.test(value)) {
    return {
      type: "channel",
      youtube_id: value,
      canonical_url: `https://www.youtube.com/${section}/${encodeURIComponent(value)}`,
    };
  }

  throw new Error("Supported links are YouTube videos, playlists, and channels.");
}

export async function fetchYouTubeMetadata(resource: NormalizedYouTube): Promise<YouTubeMetadata> {
  // ponytail: oEmbed plus page metadata keeps the MVP keyless; add YouTube Data API when accuracy matters.
  const oembed = await fetchOEmbed(resource.canonical_url);
  if (oembed?.title) return oembed;

  const page = await fetchPageMetadata(resource);
  if (page?.title) return page;

  throw new Error("Could not fetch metadata from YouTube for that link.");
}

function playlist(id: string): NormalizedYouTube {
  return {
    type: "playlist",
    youtube_id: id,
    canonical_url: `https://www.youtube.com/playlist?list=${id}`,
  };
}

async function fetchOEmbed(url: string): Promise<YouTubeMetadata | null> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const title = clean(data.title);
    if (!title) return null;

    return {
      title,
      description: null,
      thumbnail_url: clean(data.thumbnail_url),
      channel_title: clean(data.author_name),
      channel_url: clean(data.author_url),
    };
  } catch {
    return null;
  }
}

async function fetchPageMetadata(resource: NormalizedYouTube): Promise<YouTubeMetadata | null> {
  try {
    const response = await fetch(resource.canonical_url, {
      headers: {
        accept: "text/html",
        "user-agent": "Mozilla/5.0 LearnTubeDirectory/1.0",
      },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const title = clean(meta(html, "og:title") ?? titleTag(html))?.replace(/\s+-\s+YouTube$/, "");
    if (!title || title === "YouTube") return null;

    return {
      title,
      description: clean(meta(html, "og:description") ?? meta(html, "description")),
      thumbnail_url: clean(meta(html, "og:image")),
      channel_title: resource.type === "channel" ? title : null,
      channel_url: resource.type === "channel" ? resource.canonical_url : null,
    };
  } catch {
    return null;
  }
}

function meta(html: string, name: string): string | null {
  for (const [tag] of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const property = attr(tag, "property") ?? attr(tag, "name");
    if (property === name) return attr(tag, "content");
  }
  return null;
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match ? decodeHtml(match[1]) : null;
}

function titleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? decodeHtml(match[1]) : null;
}

function clean(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}
