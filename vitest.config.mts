import {defineConfig,configDefaults} from "vitest/config";
import {fileURLToPath} from "node:url";
export default defineConfig({test:{exclude:[...configDefaults.exclude,"tests/e2e/**"]},resolve:{alias:{"server-only":fileURLToPath(new URL("./node_modules/next/dist/compiled/server-only/empty.js",import.meta.url)),"@":fileURLToPath(new URL("./src",import.meta.url))}}});
