import fs from "fs";
import path from "path";

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = "ankush867";
const REPO = "ff-tournament";
const BRANCH = "main";
const ROOT = "/home/runner/workspace";

const SKIP_TOP_LEVEL = new Set([".local", ".cache", ".config", ".npm", ".upm"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".turbo", ".cache", "coverage"]);
const SKIP_EXT = new Set([".map", ".tsbuildinfo"]);

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json",
  "X-GitHub-Api-Version": "2022-11-28",
};

function getAllFiles(dir, rel = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (!rel && SKIP_TOP_LEVEL.has(entry.name)) continue;
    if (!rel && entry.name.startsWith(".") && entry.name !== ".gitignore") continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...getAllFiles(path.join(dir, entry.name), entryRel));
    } else {
      if (SKIP_EXT.has(path.extname(entry.name))) continue;
      if (entry.name.endsWith(".tsbuildinfo")) continue;
      const stat = fs.statSync(path.join(dir, entry.name));
      if (stat.size > 2 * 1024 * 1024) continue;
      files.push(entryRel);
    }
  }
  return files;
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function createBlob(relPath, fullPath) {
  const raw = fs.readFileSync(fullPath);
  const content = raw.toString("base64");
  for (let i = 0; i < 3; i++) {
    const { status, data } = await api("POST",
      `https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`,
      { content, encoding: "base64" }
    );
    if (status === 201) return data.sha;
    if (status === 429 || data.message?.includes("rate limit")) {
      console.log("  ⏳ Rate limited, waiting 20s...");
      await sleep(20000);
      continue;
    }
    console.warn(`  ⚠ Blob failed (${status}) for ${relPath}: ${data.message}`);
    return null;
  }
  return null;
}

async function main() {
  console.log(`🚀 Uploading to github.com/${OWNER}/${REPO}`);

  const { data: refData, status: refStatus } = await api("GET",
    `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`
  );

  let baseTreeSha = null, parentSha = null;
  if (refStatus === 200) {
    parentSha = refData.object.sha;
    const { data: c } = await api("GET",
      `https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${parentSha}`
    );
    baseTreeSha = c.tree.sha;
  }

  const files = getAllFiles(ROOT);
  console.log(`📁 ${files.length} files to upload\n`);

  const treeItems = [];
  let done = 0;
  for (const relPath of files) {
    const sha = await createBlob(relPath, path.join(ROOT, relPath));
    if (sha) treeItems.push({ path: relPath, mode: "100644", type: "blob", sha });
    done++;
    if (done % 50 === 0) process.stdout.write(`  ${done}/${files.length}...\r`);
    await sleep(60);
  }

  console.log(`\n✓ ${treeItems.length} blobs uploaded`);

  const treeBody = { tree: treeItems };
  if (baseTreeSha) treeBody.base_tree = baseTreeSha;

  const { status: ts, data: td } = await api("POST",
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`, treeBody
  );
  if (ts !== 201) { console.error("❌ Tree failed:", td.message); process.exit(1); }

  const { status: cs, data: cd } = await api("POST",
    `https://api.github.com/repos/${OWNER}/${REPO}/git/commits`,
    {
      message: "fix: vite config async, add packageManager, simplify render build",
      tree: td.sha,
      ...(parentSha ? { parents: [parentSha] } : {}),
      author: { name: "FF Tourney", email: "bot@fftourney.com", date: new Date().toISOString() },
    }
  );
  if (cs !== 201) { console.error("❌ Commit failed:", cd.message); process.exit(1); }
  console.log("✓ Commit:", cd.sha);

  const refUrl = `https://api.render.com/v1/services/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
  const ghRefUrl = `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
  const r = parentSha
    ? await api("PATCH", ghRefUrl, { sha: cd.sha, force: true })
    : await api("POST", `https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: cd.sha });

  if (r.status >= 400) { console.error("❌ Ref failed:", r.data.message); process.exit(1); }
  console.log(`\n✅ Done! → https://github.com/${OWNER}/${REPO}`);
  return cd.sha;
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
