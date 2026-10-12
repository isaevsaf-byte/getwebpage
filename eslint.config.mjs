import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Stale duplicate of the source tree — linting it reports phantom errors.
    ".claude/**",
    // One-off Puppeteer script, run by hand with node.
    "scripts/**",
    "telegram-bots/**",
  ]),
]);

export default eslintConfig;
