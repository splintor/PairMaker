import { PrismaClient, Gender } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const community = await db.community.upsert({
    where: { id: "seed-community" },
    update: {},
    create: { id: "seed-community", name: "קהילת ירושלים" },
  });

  // Replace with your own email to become admin after first sign-in.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const user = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "מנהל הקהילה" },
  });

  await db.membership.upsert({
    where: { userId_communityId: { userId: user.id, communityId: community.id } },
    update: { role: "admin" },
    create: { userId: user.id, communityId: community.id, role: "admin" },
  });

  // Year of birth is stored as a birthdate (today's month/day, year shifted back by age).
  const yob = (age: number) => new Date(Date.UTC(new Date().getUTCFullYear() - age, 5, 9));
  const sample = [
    {
      name: "יוסי כהן",
      gender: Gender.male,
      birthdate: yob(30),
      occupation: "מהנדס",
      heightCm: 178,
      requirements: "מחפש בחורה רצינית, משפחתית, גילאי 26–31.",
    },
    {
      name: "דנה לוי",
      gender: Gender.female,
      birthdate: yob(27),
      occupation: "מורה",
      heightCm: 165,
      requirements: "מחפשת בן זוג רציני, בעל מקצוע, גילאי 28–33.",
    },
  ];
  for (const c of sample) {
    await db.candidate.create({
      data: { ...c, communityId: community.id, createdById: user.id },
    });
  }
  console.log("Seeded community, admin membership, and sample candidates.");
}

main().finally(() => db.$disconnect());
