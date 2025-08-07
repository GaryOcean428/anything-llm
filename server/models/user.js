const prisma = require("../utils/prisma");
const { EventLogs } = require("./eventLogs");
const { default: PasswordComplexity } = require("joi-password-complexity");

/** @typedef {import("@prisma/client").users} UserPrisma */
/** @typedef {Omit<UserPrisma, 'password'>} PublicUser */

const USERNAME_MAX_LENGTH = 100;
const USERNAME_MIN_LENGTH = 2;
const BIO_MAX_LENGTH = 1000;
const BCRYPT_SALT_ROUNDS = 10;
const DEFAULT_PASSWORD_MIN_CHAR = 8;
const DEFAULT_PASSWORD_MAX_CHAR = 250;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_MINUTE = 60;
const MILLISECONDS_IN_SECOND = 1000;
const ONE_DAY_IN_MS =
  HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;

const User = {
  usernameRegex: new RegExp(/^[a-z0-9_.-]+/),
  writable: [
    "username",
    "password",
    "pfpFilename",
    "role",
    "suspended",
    "dailyMessageLimit",
    "bio",
  ],
  validations: {
    /**
     * @param {string} newValue
     * @returns {string}
     */
    username(newValue = "") {
      if (String(newValue).length > USERNAME_MAX_LENGTH) {
        throw new Error(
          `Username cannot be longer than ${USERNAME_MAX_LENGTH} characters`
        );
      }
      if (String(newValue).length < USERNAME_MIN_LENGTH) {
        throw new Error(
          `Username must be at least ${USERNAME_MIN_LENGTH} characters`
        );
      }
      return String(newValue);
    },
    /**
     * @param {string} role
     * @returns {string}
     */
    role(role = "default") {
      const VALID_ROLES = ["default", "admin", "manager"];
      if (!VALID_ROLES.includes(role)) {
        throw new Error(
          `Invalid role. Allowed roles are: ${VALID_ROLES.join(", ")}`
        );
      }
      return String(role);
    },
    /**
     * @param {number|null} dailyMessageLimit
     * @returns {number|null}
     */
    dailyMessageLimit(dailyMessageLimit = null) {
      if (dailyMessageLimit === null) {
        return null;
      }
      const limit = Number(dailyMessageLimit);
      if (isNaN(limit) || limit < 1) {
        throw new Error(
          "Daily message limit must be null or a number greater than or equal to 1"
        );
      }
      return limit;
    },
    /**
     * @param {string} bio
     * @returns {string}
     */
    bio(bio = "") {
      if (!bio || typeof bio !== "string") {
        return "";
      }
      if (bio.length > BIO_MAX_LENGTH) {
        throw new Error(
          `Bio cannot be longer than ${BIO_MAX_LENGTH} characters`
        );
      }
      return String(bio);
    },
  },

  /**
   * @param {string} key
   * @param {any} value
   * @returns {number|string|null}
   */
  castColumnValue(key, value) {
    switch (key) {
      case "suspended":
        return Number(Boolean(value));
      case "dailyMessageLimit":
        return value === null ? null : Number(value);
      default:
        return String(value);
    }
  },

  /**
   * @param {UserPrisma} user
   * @returns {PublicUser}
   */
  filterFields(user) {
    // eslint-disable-next-line no-unused-vars
    const { password, ...rest } = user;
    return rest;
  },

  /**
   * @param {object} params
   * @param {string} params.username
   * @param {string} params.password
   * @param {string} [params.role]
   * @param {number|null} [params.dailyMessageLimit]
   * @param {string} [params.bio]
   * @returns {Promise<{user: PublicUser|null, error: string|null}>}
   */
  async create({ username, password, role, dailyMessageLimit, bio }) {
    const passwordCheck = this.checkPasswordComplexity(password);
    if (!passwordCheck.checkedOK) {
      return { user: null, error: passwordCheck.error };
    }

    try {
      if (!this.usernameRegex.test(username)) {
        throw new Error(
          "Username must only contain lowercase letters, periods, numbers, underscores, and hyphens with no spaces"
        );
      }

      const bcrypt = require("bcrypt");
      const hashedPassword = bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
      const user = await prisma.users.create({
        data: {
          username: this.validations.username(username),
          password: hashedPassword,
          role: this.validations.role(role),
          bio: this.validations.bio(bio),
          dailyMessageLimit:
            this.validations.dailyMessageLimit(dailyMessageLimit),
        },
      });
      return { user: this.filterFields(user), error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  /**
   * @param {object} updates
   * @param {object} prev
   * @returns {object}
   */
  loggedChanges(updates, prev = {}) {
    const changes = {};
    const sensitiveFields = ["password"];

    Object.keys(updates).forEach((key) => {
      if (!sensitiveFields.includes(key) && updates[key] !== prev[key]) {
        changes[key] = `${prev[key]} => ${updates[key]}`;
      }
    });

    return changes;
  },

  /**
   * @param {number} userId
   * @param {Partial<UserPrisma>} updates
   * @returns {Promise<{user: PublicUser|null, error: string|null, success: boolean}>}
   */
  async update(userId, updates = {}) {
    try {
      if (!userId) {
        throw new Error("No user id provided for update");
      }

      const prevUser = await this._get({ id: userId });
      if (!prevUser) {
        throw new Error("User not found");
      }

      const data = {};
      for (const key of Object.keys(updates)) {
        if (!this.writable.includes(key)) {
          continue;
        }

        const newValue = updates[key];
        if (Object.prototype.hasOwnProperty.call(this.validations, key)) {
          data[key] = this.validations[key](newValue);
        } else {
          data[key] = this.castColumnValue(key, newValue);
        }
      }

      if (Object.prototype.hasOwnProperty.call(data, "password")) {
        const passwordCheck = this.checkPasswordComplexity(data.password);
        if (!passwordCheck.checkedOK) {
          throw new Error(passwordCheck.error);
        }
        const bcrypt = require("bcrypt");
        data.password = bcrypt.hashSync(data.password, BCRYPT_SALT_ROUNDS);
      }

      const user = await prisma.users.update({
        where: { id: userId },
        data,
      });

      await EventLogs.logEvent(
        "user_updated",
        {
          changes: this.loggedChanges(updates, prevUser),
        },
        userId
      );
      return { user: this.filterFields(user), error: null, success: true };
    } catch (error) {
      return { user: null, error: error.message, success: false };
    }
  },

  /**
   * @param {number} id
   * @param {Partial<UserPrisma>} data
   * @returns {Promise<{user: UserPrisma|null, message: string|null}>}
   */
  async _update(id, data = {}) {
    if (!id) {
      throw new Error("No user id provided for update");
    }

    try {
      const user = await prisma.users.update({
        where: { id },
        data,
      });
      return { user, message: null };
    } catch (error) {
      return { user: null, message: error.message };
    }
  },

  /**
   * @param {object} clause
   * @returns {Promise<PublicUser|null>}
   */
  async get(clause = {}) {
    try {
      const user = await prisma.users.findFirst({ where: clause });
      return user ? this.filterFields(user) : null;
    } catch {
      return null;
    }
  },

  /**
   * @param {object} clause
   * @returns {Promise<UserPrisma|null>}
   */
  async _get(clause = {}) {
    try {
      const user = await prisma.users.findFirst({ where: clause });
      return user || null;
    } catch {
      return null;
    }
  },

  /**
   * @param {object} clause
   * @returns {Promise<number>}
   */
  async count(clause = {}) {
    try {
      return await prisma.users.count({ where: clause });
    } catch {
      return 0;
    }
  },

  /**
   * @param {object} clause
   * @returns {Promise<boolean>}
   */
  async delete(clause = {}) {
    try {
      await prisma.users.deleteMany({ where: clause });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * @param {object} clause
   * @param {number|null} [limit]
   * @returns {Promise<PublicUser[]>}
   */
  async where(clause = {}, limit = null) {
    try {
      const users = await prisma.users.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return users.map((usr) => this.filterFields(usr));
    } catch {
      return [];
    }
  },

  /**
   * @param {string} passwordInput
   * @returns {{checkedOK: boolean, error: string|null}}
   */
  checkPasswordComplexity(passwordInput = "") {
    const complexityOptions = {
      min: Number(process.env.PASSWORD_MIN_CHAR) || DEFAULT_PASSWORD_MIN_CHAR,
      max: Number(process.env.PASSWORD_MAX_CHAR) || DEFAULT_PASSWORD_MAX_CHAR,
      lowerCase: Number(process.env.PASSWORD_LOWER_CASE) || 0,
      upperCase: Number(process.env.PASSWORD_UPPER_CASE) || 0,
      numeric: Number(process.env.PASSWORD_NUMERIC) || 0,
      symbol: Number(process.env.PASSWORD_SYMBOL) || 0,
      requirementCount: Number(process.env.PASSWORD_REQUIREMENTS) || 0,
    };

    const { error } = PasswordComplexity(
      complexityOptions,
      "password"
    ).validate(passwordInput);

    if (error) {
      const myError = error.details.map((d) => d.message).join(", ");
      return { checkedOK: false, error: myError };
    }

    return { checkedOK: true, error: null };
  },

  /**
   * @param {UserPrisma} user
   * @returns {Promise<boolean>}
   */
  async canSendChat(user) {
    const { ROLES } = require("../utils/middleware/multiUserProtected");
    if (!user || user.dailyMessageLimit === null || user.role === ROLES.admin) {
      return true;
    }

    const { WorkspaceChats } = require("./workspaceChats");
    const currentChatCount = await WorkspaceChats.count({
      user_id: user.id,
      createdAt: {
        gte: new Date(Date.now() - ONE_DAY_IN_MS), // 24 hours
      },
    });

    return currentChatCount < user.dailyMessageLimit;
  },
};

module.exports = { User };
