const { cjsConfig, esmConfig, dtsConfig } = require("../rollup.config");

module.exports = [cjsConfig({ root: __dirname }), esmConfig({ root: __dirname }), dtsConfig({ root: __dirname })];
