import { NextResponse } from "next/server";
import { handleApi, requireAdmin } from "@/server/http";

export const GET = handleApi(async (request: Request) => {
  const session = await requireAdmin(request);
  return NextResponse.json({ user: session });
});
