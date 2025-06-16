const { Telemetry } = require("../../models/telemetry");
const { BackgroundService } = require("../BackgroundWorkers");
const { EncryptionManager } = require("../EncryptionManager");
const { CommunicationKey } = require("../comKey");
const setupTelemetry = require("../telemetry");

// Global server state tracking
let serverReady = false;
let serverStartTime = new Date();

function getServerStatus() {
  return {
    ready: serverReady,
    startTime: serverStartTime,
    uptime: Date.now() - serverStartTime.getTime()
  };
}

// Testing SSL? You can make a self signed certificate and point the ENVs to that location
// make a directory in server called 'sslcert' - cd into it
// - openssl genrsa -aes256 -passout pass:gsahdg -out server.pass.key 4096
// - openssl rsa -passin pass:gsahdg -in server.pass.key -out server.key
// - rm server.pass.key
// - openssl req -new -key server.key -out server.csr
// Update .env keys with the correct values and boot. These are temporary and not real SSL certs - only use for local.
// Test with https://localhost:3001/api/ping
// build and copy frontend to server/public with correct API_BASE and start server in prod model and all should be ok
function bootSSL(
  app,
  port = 3001,
  host = process.env.SERVER_HOST || process.env.HOST || "0.0.0.0"
) {
  try {
    console.log(
      `\x1b[33m[SSL BOOT ENABLED]\x1b[0m Loading the certificate and key for HTTPS mode...`
    );
    const fs = require("fs");
    const https = require("https");
    const privateKey = fs.readFileSync(process.env.HTTPS_KEY_PATH);
    const certificate = fs.readFileSync(process.env.HTTPS_CERT_PATH);
    const credentials = { key: privateKey, cert: certificate };
    const server = https.createServer(credentials, app);

    server
      .listen(port, host, () => {
        console.log(
          `Primary server in HTTPS mode listening on ${host}:${port}`
        );
        console.log(
          `Health check endpoint available at https://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api/ping`
        );
        console.log(`[RAILWAY] Server ready for healthcheck requests`);
        // Mark server as ready immediately after listening starts
        serverReady = true;
        // Initialize services asynchronously without blocking the server
        initializeServicesAsync();
      })
      .on("error", (error) => {
        console.error(`HTTPS server failed to start on port ${port}:`, error);
        console.error(`[RAILWAY] Server startup failed - healthcheck will fail`);
        serverReady = false;
        catchSigTerms();
      });

    require("@mintplex-labs/express-ws").default(app, server);
    return { app, server };
  } catch (e) {
    console.error(
      `\x1b[31m[SSL BOOT FAILED]\x1b[0m ${e.message} - falling back to HTTP boot.`,
      {
        ENABLE_HTTPS: process.env.ENABLE_HTTPS,
        HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH,
        HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH,
        stacktrace: e.stack,
      }
    );
    return bootHTTP(app, port);
  }
}

function bootHTTP(
  app,
  port = 3001,
  host = process.env.SERVER_HOST || process.env.HOST || "0.0.0.0"
) {
  if (!app) throw new Error('No "app" defined - crashing!');

  app
    .listen(port, host, () => {
      console.log(`Primary server in HTTP mode listening on ${host}:${port}`);
      console.log(
        `Health check endpoint available at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api/ping`
      );
      console.log(`[RAILWAY] Server ready for healthcheck requests`);
      // Mark server as ready immediately after listening starts
      serverReady = true;
      // Initialize services asynchronously without blocking the server
      initializeServicesAsync();
    })
    .on("error", (error) => {
      console.error(`Server failed to start on port ${port}:`, error);
      console.error(`[RAILWAY] Server startup failed - healthcheck will fail`);
      serverReady = false;
      catchSigTerms();
    });

  return { app, server: null };
}

async function initializeServicesAsync() {
  try {
    console.log(`[STARTUP] Initializing services asynchronously...`);
    await setupTelemetry();
    try {
      new CommunicationKey(true);
    } catch (error) {
      console.error(
        `\x1b[31m[CommunicationKey]\x1b[0m Failed to initialize communication key:`,
        error.message
      );
      // Continue without crashing if communication key fails
    }
    new EncryptionManager();
    try {
      await new BackgroundService().boot();
    } catch (error) {
      console.error(
        `\x1b[31m[BackgroundService]\x1b[0m Failed to start background service:`,
        error.message
      );
      // Continue without crashing if background service fails
    }
    console.log(`[STARTUP] Server initialization completed successfully`);
  } catch (error) {
    console.error(
      `[STARTUP] Server initialization failed but server remains operational:`,
      error
    );
    // Don't crash the server if initialization fails
  }
}

function catchSigTerms() {
  process.once("SIGUSR2", function () {
    Telemetry.flush();
    process.kill(process.pid, "SIGUSR2");
  });
  process.on("SIGINT", function () {
    Telemetry.flush();
    process.kill(process.pid, "SIGINT");
  });
}

module.exports = {
  bootHTTP,
  bootSSL,
  getServerStatus,
};
