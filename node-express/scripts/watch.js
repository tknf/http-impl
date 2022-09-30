const esbuild = require("esbuild");
const { cjsNode, esmNode, watch } = require("../../esbuild-config");

Promise.all([esbuild.build(watch(cjsNode(process.cwd()))), esbuild.build(watch(esmNode(process.cwd())))]).then(() => {
  console.log(`✓  Built index.ts`);
});
