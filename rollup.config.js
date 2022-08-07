import path from "path";
import typescript from "@rollup/plugin-typescript";
import nodeResolve from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";

function getVersion() {
  return require("./package.json").version;
}

const banner = `/**
* @tknf/http-impl ${getVersion()}
*
* Copyright (c) TKNF LLC
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of thie source tree.
*
* @license MIT
*/`;

/**
 * @returns { import("rollup").RollupOptions }
 */
function getConfig(packageName) {
  const src = `src/${packageName}`;
  const outputDir = path.resolve(__dirname, `dist/${packageName}`);
  const distDir = `./dist/${packageName}`;

  return {
    external(id) {
      return !id.startsWith(".") && !path.isAbsolute(id);
    },
    cache: false,
    input: `${src}/index.ts`,
    output: {
      dir: outputDir,
      format: "cjs",
      preserveModules: true,
      exports: "named",
      sourcemap: true,
      banner,
    },
    plugins: [
      nodeResolve({ extensions: [".ts"] }),
      typescript({
        tsconfig: "./tsconfig.json",
        rootDir: src,
        outDir: distDir,
        declaration: true,
        declarationDir: distDir,
      }),
    ],
  };
}

/**
 * @returns { import("rollup").RollupOptions[] }
 */
export default () => {
  return [
    getConfig("node"),
    getConfig("cloudflare"),
    getConfig("netlify"),
    getConfig("vercel"),
    // deno
    {
      input: `src/deno/.empty.js`,
      plugins: [
        copy({
          targets: [
            {
              src: "src/deno/**/*",
              dest: path.resolve(__dirname, "dist/deno"),
            },
          ],
          gitignore: true,
        }),
      ],
    },
  ];
};
