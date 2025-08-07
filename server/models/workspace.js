const prisma = require("../utils/prisma");
const slugify = require("slugify").default;
const { WorkspaceUser } = require("./workspaceUsers");
const { PromptHistory } = require("./promptHistory");
const { User } = require("./user");

const DEFAULT_OPEN_AI_HISTORY = 20;
const DEFAULT_SIMILARITY_THRESHOLD = 0.25;
const DEFAULT_TOP_N = 4;
const MAX_WORKSPACE_NAME_LENGTH = 255;

const slugifyGenerator = (text) =>
  slugify(text, { lower: true, remove: /[*+~.()/'"!:@]/g });

const Workspace = {
  defaultPrompt:
    "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed.",

  writable: [
    "name",
    "openAiTemp",
    "openAiHistory",
    "lastUpdatedAt",
    "openAiPrompt",
    "similarityThreshold",
    "chatProvider",
    "chatModel",
    "topN",
    "chatMode",
    "agentProvider",
    "agentModel",
    "queryRefusalResponse",
    "vectorSearchMode",
  ],

  validations: {
    name: (value) => {
      if (!value || typeof value !== "string") {
        return "My Workspace";
      }
      return String(value).slice(0, MAX_WORKSPACE_NAME_LENGTH);
    },
    openAiTemp: (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      const temp = parseFloat(value);
      if (isNaN(temp) || temp < 0) {
        return null;
      }
      return temp;
    },
    openAiHistory: (value) => {
      if (value === null || value === undefined) {
        return DEFAULT_OPEN_AI_HISTORY;
      }
      const history = parseInt(value);
      if (isNaN(history)) {
        return DEFAULT_OPEN_AI_HISTORY;
      }
      if (history < 0) {
        return 0;
      }
      return history;
    },
    similarityThreshold: (value) => {
      if (value === null || value === undefined) {
        return DEFAULT_SIMILARITY_THRESHOLD;
      }
      const threshold = parseFloat(value);
      if (isNaN(threshold)) {
        return DEFAULT_SIMILARITY_THRESHOLD;
      }
      if (threshold < 0) {
        return 0.0;
      }
      if (threshold > 1) {
        return 1.0;
      }
      return threshold;
    },
    topN: (value) => {
      if (value === null || value === undefined) {
        return DEFAULT_TOP_N;
      }
      const n = parseInt(value);
      if (isNaN(n)) {
        return DEFAULT_TOP_N;
      }
      if (n < 1) {
        return 1;
      }
      return n;
    },
    chatMode: (value) => {
      if (!value || !["chat", "query"].includes(value)) {
        return "chat";
      }
      return value;
    },
    vectorSearchMode: (value) => {
      if (!value || !["semantic", "mmr", "similarity"].includes(value)) {
        return "semantic";
      }
      return value;
    },
    chatProvider: (value) => {
      if (!value || typeof value !== "string" || value === "none") {
        return null;
      }
      return String(value);
    },
    chatModel: (value) => {
      if (!value || typeof value !== "string") {
        return null;
      }
      return String(value);
    },
    agentProvider: (value) => {
      if (!value || typeof value !== "string" || value === "none") {
        return null;
      }
      return String(value);
    },
    agentModel: (value) => {
      if (!value || typeof value !== "string") {
        return null;
      }
      return String(value);
    },
    queryRefusalResponse: (value) => {
      if (!value || typeof value !== "string") {
        return null;
      }
      return String(value);
    },
    openAiPrompt: (value) => {
      if (!value || typeof value !== "string") {
        return null;
      }
      return String(value);
    },
  },

  validateFields(updates = {}) {
    const validatedFields = {};
    for (const [key, value] of Object.entries(updates)) {
      if (!this.writable.includes(key)) {
        continue;
      }
      if (this.validations[key]) {
        validatedFields[key] = this.validations[key](value);
      } else {
        validatedFields[key] = value;
      }
    }
    return validatedFields;
  },

  async new(name = null, creatorId = null, additionalFields = {}) {
    if (!name) {
      throw new Error("Workspace name is required.");
    }

    const slug = slugifyGenerator(name);
    const existingWorkspace = await this.get({ slug });
    if (existingWorkspace) {
      return { workspace: existingWorkspace, message: "Workspace exists" };
    }

    const workspace = await prisma.workspaces.create({
      data: {
        name,
        slug,
        ...this.validateFields(additionalFields),
      },
    });

    await WorkspaceUser.create(creatorId, workspace.id);
    return { workspace, message: null };
  },

  async update(id = null, data = {}) {
    if (!id) {
      throw new Error("ID is required to update a workspace.");
    }
    if (data.name) {
      data.slug = slugifyGenerator(data.name);
    }

    try {
      const workspace = await prisma.workspaces.update({
        where: { id },
        data: this.validateFields(data),
      });
      return workspace;
    } catch {
      return null;
    }
  },

  async getWithUser(user) {
    try {
      const userWorkspaces = await WorkspaceUser.where(
        { user_id: user.id },
        null,
        { workspaces: true }
      );
      return userWorkspaces.map((wu) => wu.workspaces);
    } catch {
      return [];
    }
  },

  async workspaceUsers(workspaceId) {
    try {
      const workspaceUsers = await WorkspaceUser.where({ workspace_id: Number(workspaceId) });
      const userIds = workspaceUsers.map((wu) => wu.user_id);
      const users = await User.where({ id: { in: userIds } });
      return users.map((user) => ({
        userId: user.id,
        username: user.username,
        role: user.role,
      }));
    } catch {
      return [];
    }
  },

  async updateUsers(workspaceId, userIds = []) {
    try {
      await WorkspaceUser.delete({ workspace_id: Number(workspaceId) });
      const newUsers = userIds.map((userId) => ({
        user_id: userId,
        workspace_id: Number(workspaceId),
      }));
      if (newUsers.length > 0) {
        await WorkspaceUser.createMany(newUsers);
      }
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async trackChange(prevData, newData, user) {
    try {
      await this._handlePromptChange(prevData, newData, user);
    } catch (error) {
      // Silently fail for now.
    }
  },

  async _handlePromptChange(prevData, newData, user) {
    const newPrompt = newData?.openAiPrompt;
    const oldPrompt = prevData?.openAiPrompt;
    const promptWasChanged =
      !!newPrompt &&
      !!oldPrompt &&
      oldPrompt !== this.defaultPrompt &&
      newPrompt !== oldPrompt;

    if (promptWasChanged) {
      await PromptHistory.handlePromptChange(prevData, user);
    }

    const { Telemetry } = require("./telemetry");
    const { EventLogs } = require("./eventLogs");
    const isSamePrompt = !newPrompt || newPrompt === this.defaultPrompt || newPrompt === oldPrompt;

    if (isSamePrompt) {
      return;
    }

    await Telemetry.sendTelemetry("workspace_prompt_changed");
    await EventLogs.logEvent(
      "workspace_prompt_changed",
      {
        workspaceName: prevData?.name,
        prevSystemPrompt: oldPrompt || this.defaultPrompt,
        newSystemPrompt: newPrompt,
      },
      user?.id
    );
  },

  async where(clause = {}, limit = null, orderBy = null) {
    try {
      const results = await prisma.workspaces.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return results;
    } catch {
      return [];
    }
  },

  async get(clause = {}) {
    try {
      const workspace = await prisma.workspaces.findFirst({ where: clause });
      return workspace || null;
    } catch {
      return null;
    }
  },

  async promptHistory(workspaceId, offset = 0, limit = 20) {
    try {
      const history = await PromptHistory.where(
        { workspaceId },
        offset,
        limit,
        { createdAt: "desc" },
        {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        }
      );
      return history;
    } catch {
      return [];
    }
  },

  async deleteAllPromptHistory({ workspaceId }) {
    try {
      return await PromptHistory.delete({ workspaceId });
    } catch {
      return false;
    }
  },

  /**
   * Delete the prompt history for a workspace.
   * @param {Object} options - The options to delete the prompt history for.
   * @param {number} options.workspaceId - The ID of the workspace to delete prompt history for.
   * @param {number} options.id - The ID of the prompt history to delete.
   * @returns {Promise<boolean>} A promise that resolves to a boolean indicating the success of the operation.
   */
  async deletePromptHistory({ workspaceId, id }) {
    try {
      return await PromptHistory.delete({ id, workspaceId });
    } catch {
      return false;
    }
  },
};

module.exports = { Workspace };

