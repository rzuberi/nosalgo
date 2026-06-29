import assert from "node:assert/strict";
import { normalizeYouTubeUrl } from "../lib/youtube.ts";

assert.deepEqual(normalizeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), {
  type: "video",
  youtube_id: "dQw4w9WgXcQ",
  canonical_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
});

assert.deepEqual(normalizeYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30"), {
  type: "video",
  youtube_id: "dQw4w9WgXcQ",
  canonical_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
});

assert.deepEqual(normalizeYouTubeUrl("https://youtube.com/playlist?list=PL123_abc-456"), {
  type: "playlist",
  youtube_id: "PL123_abc-456",
  canonical_url: "https://www.youtube.com/playlist?list=PL123_abc-456",
});

assert.deepEqual(normalizeYouTubeUrl("https://www.youtube.com/@openai/videos"), {
  type: "channel",
  youtube_id: "@openai",
  canonical_url: "https://www.youtube.com/@openai",
});

assert.throws(() => normalizeYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ"), /Only YouTube/);
