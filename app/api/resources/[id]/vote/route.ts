import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { voterId } = await request.json();

    if (typeof voterId !== "string" || voterId.length < 8 || voterId.length > 80) {
      return NextResponse.json({ error: "Missing voter id." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin()
      .rpc("upvote_resource", { p_resource_id: id, p_voter_id: voterId })
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not record vote." },
      { status: 400 },
    );
  }
}
