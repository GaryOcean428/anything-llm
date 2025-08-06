/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  try {
    // Simple existence checks by running lightweight queries
    const checks = [];

    // users
    checks.push(
      prisma.$queryRawUnsafe(
        "SELECT to_regclass('anythingllm.users')::text AS exists;"
      )
    );

    // workspaces
    checks.push(
      prisma.$queryRawUnsafe(
        "SELECT to_regclass('anythingllm.workspaces')::text AS exists;"
      )
    );

    // system_settings
    checks.push(
      prisma.$queryRawUnsafe(
        "SELECT to_regclass('anythingllm.system_settings')::text AS exists;"
      )
    );

    const [usersReg, workspacesReg, systemSettingsReg] = await Promise.all(
      checks
    );

    console.log("Schema verification:");
    console.log(" - users:", usersReg?.[0]?.exists || null);
    console.log(" - workspaces:", workspacesReg?.[0]?.exists || null);
    console.log(" - system_settings:", systemSettingsReg?.[0]?.exists || null);

    // Attempt trivial counts to ensure queryability where present
    const result = {
      usersCount: null,
      workspacesCount: null,
      systemSettingsCount: null,
    };

    try {
      result.usersCount = await prisma.users.count();
    } catch {}

    try {
      result.workspacesCount = await prisma.workspaces.count();
    } catch {}

    try {
      result.systemSettingsCount = await prisma.system_settings.count();
    } catch {}

    console.log("Counts (if accessible):", result);

    // Print the developer user if present
    try {
      const dev = await prisma.users.findUnique({ where: { username: "GaryOcean" } });
      if (dev) {
        console.log("Developer user:", { id: dev.id, username: dev.username, email: dev.email, role: dev.role });
      } else {
        console.log("Developer user not found (username: GaryOcean)");
      }
    } catch {}
  } catch (err) {
    console.error("Schema verification error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
