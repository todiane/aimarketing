import { db } from "@/server/db";
import { assetTable } from "@/server/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  console.log("Fetching asset...");
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");

  if (!assetId) {
    return NextResponse.json(
      { error: "Missing assetId parameter" },
      { status: 400 }
    );
  }

  try {
    const asset = await db
      .select()
      .from(assetTable)
      .where(eq(assetTable.id, assetId))
      .execute();

    if (asset.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json(asset[0]);
  } catch (error) {
    console.error("Error fetching asset", error);
    return NextResponse.json(
      { error: "Error fetching asset" },
      { status: 500 }
    );
  }
}
