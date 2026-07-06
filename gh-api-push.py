#!/usr/bin/env python3
"""
GitHub API Push Script — 用于无法直连 git 协议时，通过 REST API 推送代码。
用法:  GH_TOKEN=ghp_xxx python gh-api-push.py [本地项目目录] [用户名/仓库名] [分支名]
缺省:  当前目录  liuxuanbing10/campus-forum  main
"""

import json, base64, os, sys, urllib.request, urllib.error

TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    print("❌ 请设置环境变量 GH_TOKEN")
    sys.exit(1)

PROJECT_DIR = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
REPO = sys.argv[2] if len(sys.argv) > 2 else "liuxuanbing10/campus-forum"
BRANCH = sys.argv[3] if len(sys.argv) > 3 else "main"
BASE_URL = f"https://api.github.com/repos/{REPO}"

SKIP_DIRS = {'node_modules', '.git', 'dist', '__pycache__', '.venv', '.next', 'build', 'target'}
SKIP_FILES = {'package-lock.json', '.env', '.DS_Store', 'pnpm-lock.yaml', 'yarn.lock'}

def gh_api(method, path, data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "gh-api-push")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code}: {err[:300]}")
        raise

print(f"📦 {REPO}  {BRANCH}  📁 {PROJECT_DIR}")

# Step 1 — 获取最新 commit
print("\n⏳ 获取最新 commit...")
try:
    ref = gh_api("GET", f"/git/refs/heads/{BRANCH}")
    latest_sha = ref["object"]["sha"]
    commit = gh_api("GET", f"/git/commits/{latest_sha}")
    base_tree = commit["tree"]["sha"]
    print(f"  commit: {latest_sha[:12]}")
except urllib.error.HTTPError:
    print("  空仓库，创建初始 commit")
    latest_sha = None
    base_tree = None

# Step 2 — 读取文件
print("\n⏳ 读取本地文件...")
files = []
for root, dirs, names in os.walk(PROJECT_DIR):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for name in names:
        if name in SKIP_FILES: continue
        full = os.path.join(root, name)
        rel = os.path.relpath(full, PROJECT_DIR).replace('\\', '/')
        with open(full, 'rb') as fh:
            content = fh.read()
        files.append((rel, content))
files.sort(key=lambda x: x[0])
print(f"  {len(files)} 个文件")

# Step 3 — 创建 blobs
print("\n⏳ 创建 Blobs...")
tree = []
for i, (path, content) in enumerate(files):
    try:
        blob = {"content": content.decode(), "encoding": "utf-8"}
    except UnicodeDecodeError:
        blob = {"content": base64.b64encode(content).decode(), "encoding": "base64"}
    r = gh_api("POST", "/git/blobs", blob)
    tree.append({"path": path, "mode": "100644", "type": "blob", "sha": r["sha"]})
    if (i + 1) % 20 == 0 or i == len(files) - 1:
        print(f"  {i+1}/{len(files)}")

# Step 4 — 创建 tree
print("\n⏳ 创建 Tree...")
payload = {"tree": tree}
if base_tree: payload["base_tree"] = base_tree
new_tree = gh_api("POST", "/git/trees", payload)["sha"]
print(f"  tree: {new_tree[:12]}")

# Step 5 — 创建 commit
print("\n⏳ 创建 Commit...")
parents = [latest_sha] if latest_sha else []
commit_data = gh_api("POST", "/git/commits", {
    "message": "chore: update via gh-api-push",
    "tree": new_tree,
    "parents": parents,
    "author": {"name": "gh-api-push", "email": "push@gh-api.local"},
})
new_commit = commit_data["sha"]
print(f"  commit: {new_commit[:12]}")

# Step 6 — 更新 ref
print(f"\n⏳ 推送到 {BRANCH}...")
gh_api("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": new_commit, "force": True})
print(f"\n✅ 推送成功！https://github.com/{REPO}/commit/{new_commit}")
