const path = require("path");
// const { builtinModules } = require("module");
const nodeResolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");
const typescript = require("@rollup/plugin-typescript");
const packageJson = require("./package.json");

const banner = `/**
* HTTP impl v${getVersion()}
*
* Copyright (c) TKNF LLC
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of thie source tree.
*
* @license MIT
*/`;

/*
function resolveBuiltinModules() {
  return builtinModules.filter((mod) => !Object.keys(require("./package.json").dependencies || {}).includes(mod));
}
*/

function getExternals() {
  return [
    "@tknf/http-impl/_runtime",
    "@tknf/http-impl/node",
    ...Object.keys(require("./package.json").dependencies),
    ...Object.keys(require("./package.json").devDependencies)
  ];
}

/**
 * @param { BuildConfigOptions } options
 * @returns { import("rollup").RollupOptions }
 */
module.exports.cjsConfig = ({ root }) => {
  return {
    external: getExternals(),
    treeshake: {
      moduleSideEffects: "no-external",
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    },
    input: path.resolve(root, "index.ts"),
    output: buildOutputConfigs({ root, type: "cjs" }),
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false
      }),
      commonjs({
        extensions: [".ts", ".js"]
      }),
      json(),
      commonjs({
        include: /node_modules\//
      })
    ]
  };
};

/**
 * @param { BuildConfigOptions } options
 * @returns { import("rollup").RollupOptions }
 */
module.exports.esmConfig = ({ root }) => {
  return {
    external: getExternals(),
    treeshake: {
      moduleSideEffects: "no-external",
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    },
    input: path.resolve(root, "index.ts"),
    output: buildOutputConfigs({ root, type: "module" }),
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false
      }),
      commonjs({
        extensions: [".ts", ".js"]
      }),
      json()
    ]
  };
};

/**
 * @param { BuildConfigOptions } options
 * @returns { import("rollup").RollupOptions }
 */
module.exports.dtsConfig = ({ root }) => {
  const tsconfig = require(path.resolve(root, "./tsconfig.json"));
  return {
    external: getExternals(),
    treeshake: {
      moduleSideEffects: "no-external",
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    },
    input: path.resolve(root, "index.ts"),
    output: buildOutputConfigs({ root, type: "dts" }),
    plugins: [
      require("rollup-plugin-dts").default({
        compilerOptions: {
          ...tsconfig.compilerOptions,
          declaration: true,
          noEmit: false,
          noEmitOnError: true,
          emitDeclarationOnly: true,
          checkJs: false,
          declarationMap: false,
          skipLibCheck: true,
          preserveSymlinks: false,
          target: "esnext",
          module: "esnext",
          incremental: false
        }
      }),
      json()
    ]
  };
};

/** @type { import("rollup").RollupOptions["output"] } */
const commonBuildOutputOptions = {
  exports: "named",
  externalLiveBindings: false,
  freeze: false,
  banner
};

/**
 * @param { BuildOutputConfigOptions } options
 * @returns { import("rollup").RollupOptions["output"] }
 */
function buildOutputConfigs({ root, type }) {
  if (type === "cjs") {
    return {
      ...commonBuildOutputOptions,
      file: path.resolve(root, "dist/index.js"),
      format: "cjs"
    };
  } else if (type === "module") {
    return {
      ...commonBuildOutputOptions,
      file: path.resolve(root, "dist/index.mjs"),
      format: "esm"
    };
  } else if (type === "dts") {
    return {
      ...commonBuildOutputOptions,
      file: path.resolve(root, "dist/index.d.ts")
    };
  }
}

function getVersion() {
  return packageJson.version;
}

/**
 * @typedef { { root: string } } BuildConfigOptions
 * @typedef { { root: string, type: "cjs" | "module" | "dts" } } BuildOutputConfigOptions
 */
