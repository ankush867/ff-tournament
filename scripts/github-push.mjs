import fs from "fs";
import path from "path";

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = "ankush867";
const REPO = "ff-tournament";
const BRANCH = "main";
const ROOT = "/home/runner/workspace";

// Top-level dirs/files to completely skip
const SKIP_TOP_LEVEL = new Set([".local", ".cache", ".config", ".npm"]);

// Dir names to skip anywhere in tree
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", ".turbo", ".cache",
  "coverage", "__pycache__", ".tsbuildinfo",
]);

// File extensions to skip
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
    // Skip top-level hidden/system dirs
    if (!rel && SKIP_TOP_LEVEL.has(entry.name)) continue;
    if (entry.name.startsWith(".") && !rel && entry.name !== ".gitignore" && entry.name !== ".env.example") continue;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...getAllFiles(path.join(dir, entry.name), entryRel));
    } else {
      const ext = path.extname(entry.name);
      if (SKIP_EXT.has(ext)) continue;
      if (entry.name.endsWith(".tsbuildinfo")) continue;
      const stat = fs.statSync(path.join(dir, entry.name));
      if (stat.size > 2 * 1024 * 1024) continue; // skip > 2MB
      files.push(entryRel);
    }
  }
  return files;
}

async function apiGet(url) {
  const res = await fetch(url, { headers });
  return { status: res.status, data: await res.json() };
}

async function apiPost(url, body) {
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

async function apiPatch(url, body) {
  const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify(body) });
  return { status: res.status, data: await res.json() };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function createBlobWithRetry(relPath, fullPath) {
  let content, encoding;
  const raw = fs.readFileSync(fullPath);
  const isBinary = raw.includes(0);
  if (isBinary) {
    content = raw.toString("base64");
    encoding = "base64";
  } else {
    content = raw.toString("utf8");
    encoding = "utf-8";
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { status, data } = await apiPost(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`,
      { content, encoding }
    );
    if (status === 201) return data.sha;
    if (status === 429 || (data.message && data.message.includes("rate limit"))) {
      console.log(`  ⏳ Rate limited, waiting 15s...`);
      await sleep(15000);
      continue;
    }
    console.warn(`  ⚠ Blob failed [${status}] ${relPath}: ${data.message}`);
    return null;
  }
  return null;
}

async function main() {
  console.log(`🚀 Uploading to github.com/${OWNER}/${REPO}`);

  const { data: refData, status: refStatus } = await apiGet(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`
  );

  let baseTreeSha = null;
  let parentSha = null;

  if (refStatus === 200) {
    parentSha = refData.object.sha;
    const { data: commitData } = await apiGet(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${parentSha}`
    );
    baseTreeSha = commitData.tree.sha;
    console.log("✓ Existing branch found");
  }

  const files = getAllFiles(ROOT);
  console.log(`📁 ${files.length} files to upload (project files only)\n`);

  const treeItems = [];
  let done = 0;

  for (const relPath of files) {
    const fullPath = path.join(ROOT, relPath);
    const sha = await createBlobWithRetry(relPath, fullPath);
    if (sha) {
      treeItems.push({ path: relPath, mode: "100644", type: "blob", sha });
    }
    done++;
    if (done % 50 === 0) {
      process.stdout.write(`  ${done}/${files.length} files...\r`);
    }
    // Small delay to avoid rate limits
    await sleep(50);
  }

  console.log(`\n✓ ${treeItems.length} blobs created`);

  const treeBody = { tree: treeItems };
  if (baseTreeSha) treeBody.base_tree = baseTreeSha;

  const { status: treeStatus, data: treeData } = await apiPost(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`,
    treeBody
  );

  if (treeStatus !== 201) {
    console.error("❌ Tree failed:", JSON.stringify(treeData));
    process.exit(1);
  }
  console.log("✓ Tree created");

  const { status: commitStatus, data: commitData } = await apiPost(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/commits`,
    {
      message: "feat: Free Fire Tournament website - complete project",
      tree: treeData.sha,
      ...(parentSha ? { parents: [parentSha] } : {}),
      author: { name: "FF Tourney", email: "bot@fftourney.com", date: new Date().toISOString() },
    }
  );

  if (commitStatus !== 201) {
    console.error("❌ Commit failed:", JSON.stringify(commitData));
    process.exit(1);
  }
  console.log("✓ Commit created:", commitData.sha);

  const refUrl = `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`;
  const refResult = parentSha
    ? await apiPatch(refUrl, { sha: commitData.sha, force: true })
    : await apiPost(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, {
        ref: `refs/heads/${BRANCH}`,
        sha: commitData.sha,
      });

  if (refResult.status >= 400) {
    console.error("❌ Ref update failed:", JSON.stringify(refResult.data));
    process.exit(1);
  }

  console.log(`\n✅ Done! → https://github.com/${OWNER}/${REPO}`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
