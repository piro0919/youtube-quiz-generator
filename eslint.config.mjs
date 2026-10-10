import magicNumbers from "@piro0919/eslint-config";
import tailwind from "@piro0919/eslint-config/tailwind";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...magicNumbers(),
  ...tailwind({ cssConfigPath: "src/app/globals.css" }),
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
