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

    return new Response(new Uint8Array(application.resumeData), {
      headers: {
        "Content-Type": application.resumeMimeType,
        "Content-Disposition": `attachment; filename="${application.resumeFileName.replace(/"/g, "")}"`,
      },
    });
  },
);
