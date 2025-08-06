const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load environment variables from .env.development
const envPath = path.join(__dirname, "server", ".env.development");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent.split("\n");

  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...values] = trimmedLine.split("=");
      if (key && values.length > 0) {
        process.env[key] = values.join("=");
      }
    }
  }
}

console.log("== DEBUG: Terminal Issue Diagnosis ===");
console.log(`Node.js version: ${process.version}`);
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

console.log("\n=== Checking Required Files ===");
const requiredFiles = [
  "server/index.js",
  "server/package.json",
  "server/.env.development",
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
  }
}

console.log("\n=== Environment Variables Check ===");
const envVars = ["NODE_ENV", "PORT", "DATABASE_URL", "JWT_SECRET"];
for (const envVar of envVars) {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ${process.env[envVar]}`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
  }
}

console.log("\n=== Checking Dependencies ===");
if (fs.existsSync("server/package.json")) {
  console.log("✅ server/package.json exists");

  if (fs.existsSync("server/node_modules")) {
    console.log("✅ server/node_modules (dependencies installed)");
  } else {
    console.log("❌ server/node_modules - DEPENDENCIES NOT INSTALLED");
  }
} else {
  console.log("❌ server/package.json - NOT FOUND");
}

console.log("\n=== Testing Server Startup ===");
try {
  console.log("Testing: cd server && npm run start:migrate");
  const output = execSync("cd server && timeout 10s npm run start:migrate", {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (output.includes("Primary server in HTTP mode listening on 0.0.0.0:3001")) {
    console.log("✅ Server started successfully");
    console.log("Output:", output);
  } else {
    console.log("❌ Server startup failed");
    console.log("Output:", output);
  }
} catch (error) {
  console.log("❌ Server startup failed");
  console.log("Error output:", error.message);
  if (error.stdout) console.log("Stdout:", error.stdout);
  if (error.stderr) console.log("Stderr:", error.stderr);
}

console.log("\n=== Testing Server Health ===");
try {
  console.log("Testing: curl http://localhost:3001/api/ping");
  const healthOutput = execSync("curl http://localhost:3001/api/ping", {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (healthOutput.includes("online")) {
    console.log("✅ Server is healthy");
    console.log("Health check output:", healthOutput);
  } else {
    console.log("❌ Server is not responding correctly");
    console.log("Health check output:", healthOutput);
  }
} catch (error) {
  console.log("❌ Server health check failed");
  console.log("Error:", error.message);
}

console.log("\n=== Checking Railway Configuration ===");
const railwayConfig = ["railway.toml"];
for (const config of railwayConfig) {
  if (fs.existsSync(config)) {
    console.log(`✅ ${config} exists`);
  } else {
    console.log(`❌ ${config} - NOT FOUND`);
  }
}

if (fs.existsSync("railway.toml")) {
  try {
    const railwayContent = fs.readFileSync("railway.toml", "utf8");
  if (railwayContent.includes("startCommand = ")) {
    console.log("✅ Railway start command configured");
  } else {
    console.log("❌ Railway start command not found");
  }
  } catch (error) {
    console.log("❌ Error reading railway.toml");
  }
}

console.log("\n=== Debug Complete ===");
