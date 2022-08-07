interface ProcessEnv {
  NODE_ENV: "development" | "production" | "test";
}

interface Process {
  env: ProcessEnv;
}

// @ts-ignore
var process: Process;
