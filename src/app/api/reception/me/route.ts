import { NextResponse } from "next/server";
import { handleApi, requireReception } from "@/server/http";

export const GET = handleApi(async (request: Request) => {
  const session = await requireReception(request);
  return NextResponse.json({ user: session });
});
