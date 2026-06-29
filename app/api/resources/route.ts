import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { ResourceType, SortMode } from "@/lib/types";
import { fetchYouTubeMetadata, normalizeYouTubeUrl } from "@/lib/youtube";

const resourceTypes: ResourceType[] = ["video", "playlist", "channel"];
const sortModes: SortMode[] = ["top", "newest"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ResourceType | null;
    const sort = (searchParams.get("sort") as SortMode | null) ?? "newest";

    if (type && !resourceTypes.includes(type)) {
      return NextResponse.json({ error: "Unknown resource type." }, { status: 400 });
    }
    if (!sortModes.includes(sort)) {
      return NextResponse.json({ error: "Unknown sort mode." }, { status: 400 });
    }

    let query = supabaseAdmin().from("resources").select("*");
    if (type) query = query.eq("type", type);
    query =
      sort === "top"
        ? query.order("upvote_count", { ascending: false }).order("created_at", { ascending: false })
        : query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ resources: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalized = normalizeYouTubeUrl(String(body.url ?? ""));
    const metadata = await fetchYouTubeMetadata(normalized);

    const { data, error } = await supabaseAdmin()
      .from("resources")
      .insert({
        type: normalized.type,
        youtube_id: normalized.youtube_id,
        youtube_url: normalized.canonical_url,
        canonical_url: normalized.canonical_url,
        ...metadata,
      })
      .select("*")
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "That YouTube link is already in the directory." }, { status: 409 });
    }
    if (error) throw error;

    return NextResponse.json({ resource: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: message(error) }, { status: 400 });
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
