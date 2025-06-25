// Load environment variables
const envResult =
  process.env.NODE_ENV === "development"
    ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
    : require("dotenv").config();

console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || "production"}`);
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
console.log(`[STARTUP] Server Port: ${PORT}`);
console.log(`[STARTUP] HTTPS Enabled: ${!!process.env.ENABLE_HTTPS}`);

require("./utils/logger")();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { reqBody } = require("./utils/http");
const { systemEndpoints } = require("./endpoints/system");
const { workspaceEndpoints } = require("./endpoints/workspaces");
const { chatEndpoints } = require("./endpoints/chat");
const { embeddedEndpoints } = require("./endpoints/embed");
const { embedManagementEndpoints } = require("./endpoints/embedManagement");
const { getVectorDbClass } = require("./utils/helpers");
const { adminEndpoints } = require("./endpoints/admin");
const { inviteEndpoints } = require("./endpoints/invite");
const { utilEndpoints } = require("./endpoints/utils");
const { developerEndpoints } = require("./endpoints/api");
const { extensionEndpoints } = require("./endpoints/extensions");
const { bootHTTP, bootSSL } = require("./utils/boot");
const { workspaceThreadEndpoints } = require("./endpoints/workspaceThreads");
const { documentEndpoints } = require("./endpoints/document");
const { agentWebsocket } = require("./endpoints/agentWebsocket");
const { experimentalEndpoints } = require("./endpoints/experimental");
const { browserExtensionEndpoints } = require("./endpoints/browserExtension");
const { communityHubEndpoints } = require("./endpoints/communityHub");
const { agentFlowEndpoints } = require("./endpoints/agentFlows");
const { mcpServersEndpoints } = require("./endpoints/mcpServers");
const app = express();
const apiRouter = express.Router();
const FILE_LIMIT = "3GB";

app.use(cors({ origin: true }));
app.use(bodyParser.text({ limit: FILE_LIMIT }));
app.use(bodyParser.json({ limit: FILE_LIMIT }));
app.use(
  bodyParser.urlencoded({
    limit: FILE_LIMIT,
    extended: true,
  })
);

if (!!process.env.ENABLE_HTTPS) {
  bootSSL(app, PORT);
} else {
  require("@mintplex-labs/express-ws").default(app); // load WebSockets in non-SSL mode.
}

app.use("/api", apiRouter);
console.log("[STARTUP] Registering API endpoints...");
systemEndpoints(apiRouter);
console.log("[STARTUP] System endpoints registered (includes /api/ping)");
extensionEndpoints(apiRouter);
workspaceEndpoints(apiRouter);
workspaceThreadEndpoints(apiRouter);
chatEndpoints(apiRouter);
adminEndpoints(apiRouter);
inviteEndpoints(apiRouter);
embedManagementEndpoints(apiRouter);
utilEndpoints(apiRouter);
documentEndpoints(apiRouter);
agentWebsocket(apiRouter);
experimentalEndpoints(apiRouter);
developerEndpoints(app, apiRouter);
communityHubEndpoints(apiRouter);
agentFlowEndpoints(apiRouter);
mcpServersEndpoints(apiRouter);
console.log("[STARTUP] All API endpoints registered");

// Externally facing embedder endpoints
embeddedEndpoints(apiRouter);

// Externally facing browser extension endpoints
browserExtensionEndpoints(apiRouter);

if (process.env.NODE_ENV !== "development") {
  const { MetaGenerator } = require("./utils/boot/MetaGenerator");
  const IndexPage = new MetaGenerator();

  app.use(
    express.static(path.resolve(__dirname, "public"), {
      extensions: ["js"],
      setHeaders: (res, path) => {
        // Disable I-framing of entire site UI
        res.removeHeader("X-Powered-By");
        res.setHeader("X-Frame-Options", "DENY");

        // Ensure correct MIME type for JavaScript files
        if (path.endsWith(".js")) {
          res.setHeader(
            "Content-Type",
            "application/javascript; charset=utf-8"
          );
        }
      },
    })
  );

  app.use("/", function (_, response) {
    IndexPage.generate(response);
    return;
  });

  app.get("/robots.txt", function (_, response) {
    response.type("text/plain");
    response.send("User-agent: *\nDisallow: /").end();
  });
} else {
  // Debug route for development connections to vectorDBs
  apiRouter.post("/v/:command", async (request, response) => {
    try {
      const VectorDb = getVectorDbClass();
      const { command } = request.params;
      if (!Object.getOwnPropertyNames(VectorDb).includes(command)) {
        response.status(500).json({
          message: "invalid interface command",
          commands: Object.getOwnPropertyNames(VectorDb),
        });
        return;
      }

      try {
        const body = reqBody(request);
        const resBody = await VectorDb[command](body);
        response.status(200).json({ ...resBody });
      } catch (e) {
        // console.error(e)
        console.error(JSON.stringify(e));
        response.status(500).json({ error: e.message });
      }
      return;
    } catch (e) {
      console.error(e.message, e);
      response.sendStatus(500).end();
    }
  });
}

app.all("*", function (_, response) {
  response.sendStatus(404);
});

// In non-https mode we need to boot at the end since the server has not yet
// started and is `.listen`ing.
console.log("[STARTUP] Starting server...");

// Add process-level error handlers to prevent crashes during Railway healthchecks
process.on("uncaughtException", (error) => {
  console.error(
    "[UNCAUGHT EXCEPTION] Server encountered an error but will continue running:",
    error
  );
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[UNHANDLED REJECTION] Server encountered an unhandled promise rejection but will continue running:",
    reason
  );
});

if (!process.env.ENABLE_HTTPS) bootHTTP(app, PORT);
