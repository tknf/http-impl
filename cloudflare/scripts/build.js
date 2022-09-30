const esbuild = require("esbuild");
const { worker } = require("../../esbuild-config");

esbuild.build(worker(process.cwd())).then(() => {
  console.log(`✓  Built index.ts`);
});
