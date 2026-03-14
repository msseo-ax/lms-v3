import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const div1 = await prisma.division.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", name: "경영본부" },
  });

  const div2 = await prisma.division.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000002", name: "사업본부" },
  });

  const div3 = await prisma.division.upsert({
    where: { id: "00000000-0000-0000-0000-000000000003" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000003", name: "기술본부" },
  });

  await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0001-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0001-000000000001", name: "경영지원팀", divisionId: div1.id },
  });

  await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0001-000000000002" },
    update: {},
    create: { id: "00000000-0000-0000-0001-000000000002", name: "인사팀", divisionId: div1.id },
  });

  await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0001-000000000003" },
    update: {},
    create: { id: "00000000-0000-0000-0001-000000000003", name: "AMS팀", divisionId: div2.id },
  });

  await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0001-000000000004" },
    update: {},
    create: { id: "00000000-0000-0000-0001-000000000004", name: "PM팀", divisionId: div2.id },
  });

  await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0001-000000000005" },
    update: {},
    create: { id: "00000000-0000-0000-0001-000000000005", name: "개발팀", divisionId: div3.id },
  });

  await prisma.team.upsert({
    where: { id: "00000000-0000-0000-0001-000000000006" },
    update: {},
    create: { id: "00000000-0000-0000-0001-000000000006", name: "디자인팀", divisionId: div3.id },
  });

  await prisma.user.upsert({
    where: { email: "admin@homes.global" },
    update: {},
    create: {
      email: "admin@homes.global",
      name: "관리자",
      role: "admin",
      divisionId: div1.id,
      teamId: "00000000-0000-0000-0001-000000000001",
    },
  });

  // 기존 콘텐츠 및 카테고리 정리 (카테고리 재구성)
  await prisma.readLog.deleteMany();
  await prisma.fileAccessLog.deleteMany();
  await prisma.contentTarget.deleteMany();
  await prisma.contentFile.deleteMany();
  await prisma.content.deleteMany();
  await prisma.category.deleteMany();

  const defaultCategories = [
    { name: "온보딩", slug: "onboarding", sortOrder: 1 },
    { name: "법정필수교육", slug: "legal-required", sortOrder: 2 },
    { name: "리더십", slug: "leadership", sortOrder: 3 },
    { name: "성장", slug: "growth", sortOrder: 4 },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log("Seed completed successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
