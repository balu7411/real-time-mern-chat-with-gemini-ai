const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("📦 [Repomix] Packaging repository into token-optimized AST representation...");

try {
  // Run repomix with npx
  execSync("npx -y repomix --config repomix.config.json", {
    stdio: "inherit",
    cwd: path.resolve(__dirname, "..")
  });

  const outputPath = path.resolve(__dirname, "..", "repomix-output.xml");
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    console.log(`✅ [Repomix] Repository packaged successfully! Size: ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.log("ℹ️ [Repomix] Packaging finished.");
  }
} catch (error) {
  console.error("❌ [Repomix] Packaging failed:", error.message);
  process.exit(1);
}
