module.exports = {
  testRegex: "/test/.*\\.test\\.ts$",
  modulePathIgnorePatterns: ["<rootDir>/examples/"],
  setupFilesAfterEnv: ["<rootDir>/test/jest-setup.ts"],
  moduleNameMapper: {
    "^@tknf/http-impl$": "<rootDir>/node/index.ts",
    "^@tknf/http-impl/node$": "<rootDir>/node/index.ts",
    "^@tknf/http-impl/node-connect$": "<rootDir>/node-connect/index.ts",
    "^@tknf/http-impl/node-express$": "<rootDir>/node-express/index.ts",
    "^@tknf/http-impl/cloudflare$": "<rootDir>/cloudflare/index.ts",
    "^@tknf/http-impl/netlify$": "<rootDir>/netlify/index.ts",
    "^@tknf/http-impl/vercel$": "<rootDir>/vercel/index.ts",
    "^@tknf/http-impl/_runtime$": "<rootDir>/_runtime/index.ts"
  },
  transform: {
    "^.+\\.(t|j)s$": "@swc/jest"
  },
  coveragePathIgnorePatterns: ["/node_modules/", "/dist/", "/test/"],
  coverageReporters: ["text", "html"]
};
