import { defineConfig } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const withProject = (configs) =>
  configs.map((config) => ({
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions?.parserOptions,
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }));

export default defineConfig([
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "eslint.config.mjs",
      "postcss.config.mjs",
      "pnpm-lock.yaml",
    ],
  },
  ...withProject(tseslint.configs.strictTypeChecked),
  ...withProject(tseslint.configs.stylisticTypeChecked),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
]);
