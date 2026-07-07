import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InvalidTransitionError } from "./domain/bookingStatus";

// Shared route-handler plumbing: typed errors, RBAC guards, pagination and
// validation helpers. Every admin API route wraps its logic in handleApi so
// error shapes stay uniform.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (msg: string, code?: string) => new ApiError(400, msg, code);
export const unauthorized = (msg = "Unauthorized access") => new ApiError(401, msg);
export const forbidden = (msg = "Insufficient permissions") => new ApiError(403, msg);
export const notFound = (msg = "Not found") => new ApiError(404, msg);
export const conflict = (msg: string, code?: string) => new ApiError(409, msg, code);

export interface Session {
  userId: string;
  email: string;
  role: "ADMIN" | "THERAPIST";
}

export async function requireSession(request: Request, roles: Session["role"][]): Promise<Session> {
  const session = (await getSession(request)) as Session | null;
  if (!session) throw unauthorized();
  if (!roles.includes(session.role)) throw forbidden();
  return session;
}

export const requireAdmin = (request: Request) => requireSession(request, ["ADMIN"]);
export const requireStaff = (request: Request) => requireSession(request, ["ADMIN", "THERAPIST"]);

export interface TherapistContext {
  session: Session;
  therapistId: string;
}

/**
 * Resolves the logged-in THERAPIST session to their own Therapist row.
 * Every /api/therapist/* route scopes reads and writes to this id — a
 * therapist can never see or mutate another consultant's data.
 */
export async function requireTherapist(request: Request): Promise<TherapistContext> {
  const session = await requireSession(request, ["THERAPIST"]);
  const therapist = await prisma.therapist.findUnique({ where: { userId: session.userId } });
  if (!therapist) throw forbidden("No consultant profile is linked to this account");
  return { session, therapistId: therapist.id };
}

export function handleApi<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse | Response>
) {
  return async (...args: T): Promise<NextResponse | Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Let Next.js's static-rendering bailout propagate so routes are
      // correctly detected as dynamic at build time.
      if (
        error instanceof Error &&
        ((error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE" ||
          error.message.includes("Dynamic server usage"))
      ) {
        throw error;
      }
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      }
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json(
          { error: error.message, code: "INVALID_TRANSITION" },
          { status: 409 }
        );
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return NextResponse.json(
          { error: `${first?.path?.join(".") || "input"}: ${first?.message || "invalid"}`, code: "VALIDATION" },
          { status: 400 }
        );
      }
      console.error("API error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export function parseBody<S extends ZodSchema>(schema: S, raw: unknown): S["_output"] {
  return schema.parse(raw);
}

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(searchParams: URLSearchParams, defaultPageSize = 20): Pagination {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || String(defaultPageSize), 10) || defaultPageSize)
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated<T>(items: T[], total: number, { page, pageSize }: Pagination) {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
