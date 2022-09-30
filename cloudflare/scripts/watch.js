const esbuild = require("esbuild");
const { worker, watch } = require("../../esbuild-config");

esbuild.build(watch(worker(process.cwd()))).then(() => {
  console.log(`✓  Built index.ts`);
});
