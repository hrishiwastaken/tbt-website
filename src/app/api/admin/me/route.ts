import { NextResponse } from "next/server";
import { handleApi, requireStaff } from "@/server/http";

export const GET = handleApi(async (request: Request) => {
  const session = await requireStaff(request);
  return NextResponse.json({ user: session });
});
