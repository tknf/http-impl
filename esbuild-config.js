const { builtinModules } = require("module");
const packageJson = require("./package.json");
const dependencies = Object.keys(packageJson.dependencies);

/**
 * @param { string } root
 * @returns { import("esbuild").BuildOptions }
 */
module.exports.cjsNode = function (root) {
  return {
    absWorkingDir: root,
    entryPoints: ["./index.ts"],
    outfile: "./dist/index.js",
    format: "cjs",
    platform: "node",
    bundle: true,
    external: builtinModules.filter((mod) => !dependencies.includes(mod)),
    treeShaking: true,
    mainFields: ["main", "module"],
    target: "node14",
    tsconfig: "./tsconfig.json"
  };
};

/**
 * @param { string } root
 * @returns { import("esbuild").BuildOptions }
 */
module.exports.esmNode = function (root) {
  return {
    absWorkingDir: root,
    entryPoints: ["./index.ts"],
    outfile: "./dist/index.mjs",
    format: "esm",
    platform: "node",
    bundle: true,
    external: builtinModules.filter((mod) => !dependencies.includes(mod)),
    treeShaking: true,
    mainFields: ["module", "main"],
    target: "node14",
    tsconfig: "./tsconfig.json"
  };
};

/**
 * @param { string } root
 * @returns { import("esbuild").BuildOptions }
 */
module.exports.worker = function (root) {
  return {
    absWorkingDir: root,
    entryPoints: ["./index.ts"],
    outfile: "./dist/index.js",
    format: "esm",
    platform: "neutral",
    conditions: ["worker"],
    bundle: true,
    external: builtinModules.filter((mod) => !dependencies.includes(mod)),
    treeShaking: true,
    mainFields: ["browser", "module", "main"],
    target: "node14",
    tsconfig: "./tsconfig.json"
  };
};

/**
 * @param { import("esbuild").BuildOptions } options
 * @returns { import("esbuild").BuildOptions }
 */
module.exports.watch = function (options) {
  return {
    ...options,
    watch: {
      onRebuild(err) {
        if (err) {
          console.error(err.message);
        } else {
          console.log(`✓  Rebuilt`);
        }
      }
    }
  };
};
