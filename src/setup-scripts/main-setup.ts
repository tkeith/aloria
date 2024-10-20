import { execSync } from "child_process";

console.log("Installing Playwright browsers...");

try {
  execSync(
    "npx playwright install && npx playwright install-deps && cd /app && npm install --os=linux --cpu=arm64 sharp",
    {
      stdio: "inherit",
    },
  );

  process.exit(0);
} catch (error) {
  console.error("Error running setup script:", error);
  process.exit(1);
}
