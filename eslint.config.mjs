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
    ],
  },
  ...next,
];

export default eslintConfig;
