const { execSync } = require("node:child_process");
const semver = require("semver");

function getTaggedVersion() {
  const output = execSync(`git tag --list --points-at HEAD`).toString().trim();
  return output.replace(/^v/g, "");
}

function publish(tag) {
  execSync(`npm publish --access public --tag ${tag}`, {
    stdio: "inherit"
  });
}

async function run() {
  const taggedVersion = getTaggedVersion();
  if (taggedVersion === "") {
    console.error(`Missing release version. Please run the version script first.`);
    process.exit(1);
  }

  const prerelease = semver.prerelease(taggedVersion);
  const prereleasetag = prerelease ? prerelease[0] : undefined;
  const tag = prereleasetag ? (prereleasetag.includes("canary") ? "canary" : prerelease) : "latest";

  publish(tag);
}

run().then(
  () => {
    process.exit(0);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
