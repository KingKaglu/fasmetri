import next from "eslint-config-next";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      ".codex-logs/**",
      "reports/**",
      "next-env.d.ts",
      // Local-only, git-ignored scratch trees (Python venvs with vendored JS).
      "scraper-sgai/**",
      "phase2-browser/**",
      "phase3-browser/**",
      "**/.venv/**",
    ],
  },
  ...next,
];

export default eslintConfig;
