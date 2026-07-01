import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

// Standalone flat config (replaces eslint-config-next). Type-aware linting via
// projectService, scoped to the app source under src/ and the Vercel functions
// under api/. Config files at the root are ignored to avoid "file not in
// tsconfig project" crashes from the type-aware parser.
const eslintConfig = [
  {
    // Build artifacts, generated output, dev-only tooling, and static assets
    // are not linted.
    ignores: [
      "dist/**",
      "node_modules/**",
      ".vercel/**",
      "public/**",
      "scripts/**",
      "*.config.*",
    ],
  },
  {
    files: [
      "src/**/*.{ts,tsx,mts}",
      "api/**/*.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];

export default eslintConfig;
