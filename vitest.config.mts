import { defineConfig } from "vitest/config";
import { transformWithOxc } from "vite";
import path from "path";

// Several components are .js files containing JSX — Next compiles those with
// SWC, which allows it, but Vite's oxc transform treats .js as plain JS and
// its `oxc` config option deliberately omits `lang`. Force the JSX parser for
// our own sources so component tests can import them.
const jsxInJs = {
  name: "jsx-in-js",
  enforce: "pre" as const,
  async transform(code: string, id: string) {
    if (!/\/src\/.*\.js$/.test(id.replace(/\\/g, "/").split("?")[0])) {
      return null;
    }
    const { code: transformed, map } = await transformWithOxc(code, id, {
      lang: "jsx",
    });
    return { code: transformed, map };
  },
};

export default defineConfig({
  plugins: [jsxInJs],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share one database — run files serially.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
