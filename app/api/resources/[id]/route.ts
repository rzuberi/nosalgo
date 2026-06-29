import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { data, error } = await supabaseAdmin()
      .from("resources")
      .delete()
      .eq("id", id)
      .select("id, type")
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Resource not found." }, { status: 404 });

    return NextResponse.json({ id: data.id, type: data.type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove resource." },
      { status: 400 },
    );
  }
}
