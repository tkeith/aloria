import { db } from "@/server/db";
import { execSync } from "child_process";

console.log("Installing Playwright browsers...");

try {
  execSync(
    "npx playwright install && npx playwright install-deps && cd /app && npm install --os=linux --cpu=arm64 sharp",
    {
      stdio: "inherit",
    },
  );

  // find Pending requests and update them to Canceled, and same for steps
  await db.request.updateMany({
    where: { status: "Pending" },
    data: { status: "Canceled" },
  });
  await db.step.updateMany({
    where: { status: "Pending" },
    data: { status: "Canceled" },
  });

  process.exit(0);
} catch (error) {
  console.error("Error running setup script:", error);
  process.exit(1);
}
