import { prisma } from "@/lib/db";
import { handleApi, notFound, requireAdmin } from "@/server/http";

export const GET = handleApi(
  async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
    await requireAdmin(request);
    const { id } = await ctx.params;

    const application = await prisma.internshipApplication.findUnique({
      where: { id },
      select: { resumeData: true, resumeFileName: true, resumeMimeType: true },
    });
    if (!application) throw notFound("Application not found");

    // The stored MIME type is attacker-controlled (set by the uploader), so
    // force a download (never inline render) and forbid content-type
    // sniffing — together these stop a booby-trapped "resume" from being
    // interpreted as active content in the admin's browser.
    return new Response(new Uint8Array(application.resumeData), {
      headers: {
        "Content-Type": application.resumeMimeType,
        "Content-Disposition": `attachment; filename="${application.resumeFileName.replace(/[\r\n"]/g, "")}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
);
