const prisma = require("../utils/prisma");

const WorkspaceUser = {
  async createMany(userId, workspaceIds = []) {
    if (workspaceIds.length === 0) {
      return;
    }
    try {
      await prisma.$transaction(
        workspaceIds.map((workspaceId) =>
          prisma.workspace_users.create({
            data: { user_id: userId, workspace_id: workspaceId },
          })
        )
      );
    } catch {
      // ignore
    }
  },

  /**
   * Create many workspace users.
   * @param {Array<number>} userIds - An array of user IDs to create workspace users for.
   * @param {number} workspaceId - The ID of the workspace to create workspace users for.
   * @returns {Promise<void>} A promise that resolves when the workspace users are created.
   */
  async createManyUsers(userIds = [], workspaceId) {
    if (userIds.length === 0) {
      return;
    }
    try {
      await prisma.$transaction(
        userIds.map((userId) =>
          prisma.workspace_users.create({
            data: {
              user_id: Number(userId),
              workspace_id: Number(workspaceId),
            },
          })
        )
      );
    } catch {
      // ignore
    }
  },

  async create(userId = 0, workspaceId = 0) {
    try {
      await prisma.workspace_users.create({
        data: { user_id: Number(userId), workspace_id: Number(workspaceId) },
      });
      return true;
    } catch {
      return false;
    }
  },

  async get(clause = {}) {
    try {
      const result = await prisma.workspace_users.findFirst({ where: clause });
      return result || null;
    } catch {
      return null;
    }
  },

  async where(clause = {}, limit = null, include = null) {
    try {
      const results = await prisma.workspace_users.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(include !== null ? { include } : {}),
      });
      return results;
    } catch {
      return [];
    }
  },

  async count(clause = {}) {
    try {
      const count = await prisma.workspace_users.count({ where: clause });
      return count;
    } catch {
      return 0;
    }
  },

  async delete(clause = {}) {
    try {
      await prisma.workspace_users.deleteMany({ where: clause });
    } catch {
      // ignore
    }
  },
};

module.exports.WorkspaceUser = WorkspaceUser;
