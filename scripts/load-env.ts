import { loadEnvConfig } from "@next/env";

// Keep CLI workers aligned with the environment precedence used by Next.js.
loadEnvConfig(process.cwd());
