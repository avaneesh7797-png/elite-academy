import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["new", "contacted", "accepted", "declined"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; appId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const app = await prisma.membershipApplication.findUnique({
    where: { id: params.appId },
    include: { business: true },
  });
  if (!app || app.businessId !== params.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.business.ownerId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updated = await prisma.membershipApplication.update({
    where: { id: params.appId },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ application: updated });
}
