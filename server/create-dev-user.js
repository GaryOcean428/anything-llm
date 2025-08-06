const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function createDevUser() {
  try {
    const hashedPassword = await bcrypt.hash("I.Am.Dev.1", 10);
    const user = await prisma.users.upsert({
      where: { username: "GaryOcean" },
      update: {
        email: "braden.lang77@gmail.com",
        password: hashedPassword,
        role: "admin",
        suspended: 0
      },
      create: {
        username: "GaryOcean",
        email: "braden.lang77@gmail.com",
        password: hashedPassword,
        role: "admin",
        suspended: 0
      }
    });
    console.log("✅ Developer user created/updated:", user.username, user.email);
    console.log("User ID:", user.id);
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDevUser();
