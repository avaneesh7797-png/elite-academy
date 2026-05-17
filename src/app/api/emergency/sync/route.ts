import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPremiumStatus } from "@/lib/emergency/premium";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(1).max(40),
  relationship: z.string().max(80).default(""),
});

const profileSchema = z.object({
  name: z.string().max(120).default(""),
  dob: z.string().max(40).default(""),
  bloodType: z.string().max(20).default(""),
  weight: z.string().max(40).default(""),
  height: z.string().max(40).default(""),
  allergies: z.string().max(2000).default(""),
  conditions: z.string().max(2000).default(""),
  medications: z.string().max(2000).default(""),
  doctorName: z.string().max(120).default(""),
  doctorPhone: z.string().max(40).default(""),
  insurance: z.string().max(200).default(""),
  iceName: z.string().max(120).default(""),
  iceRelationship: z.string().max(80).default(""),
  icePhone: z.string().max(40).default(""),
  notes: z.string().max(2000).default(""),
});

const settingsSchema = z.object({
  medicalNumber: z.string().max(20),
  fireNumber: z.string().max(20),
  policeNumber: z.string().max(20),
  country: z.string().max(8),
  shareLocation: z.boolean(),
});

const bodySchema = z.object({
  contacts: z.array(contactSchema).max(50).optional(),
  profile: profileSchema.optional(),
  settings: settingsSchema.optional(),
});

export async function GET() {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [contacts, profile, settings] = await Promise.all([
    prisma.emergencyContact.findMany({ where: { userId }, orderBy: { position: "asc" } }),
    prisma.medicalProfile.findUnique({ where: { userId } }),
    prisma.emergencySettings.findUnique({ where: { userId } }),
  ]);

  return NextResponse.json({
    isPremium,
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      relationship: c.relationship,
    })),
    profile: profile
      ? {
          name: profile.name,
          dob: profile.dob,
          bloodType: profile.bloodType,
          weight: profile.weight,
          height: profile.height,
          allergies: profile.allergies,
          conditions: profile.conditions,
          medications: profile.medications,
          doctorName: profile.doctorName,
          doctorPhone: profile.doctorPhone,
          insurance: profile.insurance,
          iceName: profile.iceName,
          iceRelationship: profile.iceRelationship,
          icePhone: profile.icePhone,
          notes: profile.notes,
        }
      : null,
    settings: settings
      ? {
          medicalNumber: settings.medicalNumber,
          fireNumber: settings.fireNumber,
          policeNumber: settings.policeNumber,
          country: settings.country,
          shareLocation: settings.shareLocation,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const { userId, isPremium } = await getPremiumStatus();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isPremium) {
    return NextResponse.json(
      { error: "Cloud sync is a Premium feature.", code: "premium_required" },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { contacts, profile, settings } = parsed.data;

  if (contacts) {
    await prisma.$transaction([
      prisma.emergencyContact.deleteMany({ where: { userId } }),
      ...(contacts.length
        ? [
            prisma.emergencyContact.createMany({
              data: contacts.map((c, i) => ({
                userId,
                name: c.name,
                phone: c.phone,
                relationship: c.relationship,
                position: i,
              })),
            }),
          ]
        : []),
    ]);
  }

  if (profile) {
    await prisma.medicalProfile.upsert({
      where: { userId },
      update: profile,
      create: { userId, ...profile },
    });
  }

  if (settings) {
    await prisma.emergencySettings.upsert({
      where: { userId },
      update: settings,
      create: { userId, ...settings },
    });
  }

  return NextResponse.json({ ok: true });
}
