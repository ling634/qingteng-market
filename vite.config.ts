import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// 飞书 aPaaS 运行时在预览态会从 virtual:capabilities 读取能力声明。
// 本项目 shared/capabilities/ 为空（纯前端应用），提供空映射的桩模块即可。
const capabilitiesStub = {
  name: "capabilities-stub",
  resolveId(id: string) {
    if (id === "virtual:capabilities") return "\0virtual:capabilities";
  },
  load(id: string) {
    if (id === "\0virtual:capabilities") return "export default {};";
  },
};

// 依赖预构建（esbuild）不走 Vite 插件管线，需要等价的 esbuild 插件
const capabilitiesEsbuildStub = {
  name: "capabilities-stub",
  setup(build: {
    onResolve: (opts: { filter: RegExp }, cb: () => { path: string; namespace: string }) => void;
    onLoad: (opts: { filter: RegExp; namespace: string }, cb: () => { contents: string }) => void;
  }) {
    build.onResolve({ filter: /^virtual:capabilities$/ }, () => ({
      path: "virtual:capabilities",
      namespace: "capabilities-stub",
    }));
    build.onLoad({ filter: /.*/, namespace: "capabilities-stub" }, () => ({
      contents: "export default {};",
    }));
  },
};

export default defineConfig({
  plugins: [capabilitiesStub, react(), tailwindcss()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [capabilitiesEsbuildStub],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    "process.env.CLIENT_BASE_PATH": JSON.stringify("/"),
  },
  server: {
    port: 5173,
    open: true,
  },
});
