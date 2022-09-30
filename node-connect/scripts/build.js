const esbuild = require("esbuild");
const { cjsNode, esmNode } = require("../../esbuild-config");

Promise.all([esbuild.build(cjsNode(process.cwd())), esbuild.build(esmNode(process.cwd()))]).then(() => {
  console.log(`✓  Built index.ts`);
});
