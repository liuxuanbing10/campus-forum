#!/usr/bin/env python3
"""
一键推送到 GitHub（绕过 git 协议封锁）。
用法：python push.py [提交信息]
缺省：自动检测项目目录，推送到 liuxuanbing10/campus-forum main
"""
import json, base64, os, sys, urllib.request, urllib.error

TOKEN = os.environ.get("GH_TOKEN", "")
if not TOKEN:
    print("❌ 请设置 GH_TOKEN 环境变量")
    sys.exit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = "liuxuanbing10/campus-forum"
BRANCH = "main"
MSG = sys.argv[1] if len(sys.argv) > 1 else "chore: update"
URL = f"https://api.github.com/repos/{REPO}"
SKIP_DIRS = {'node_modules', '.git', 'dist', '__pycache__', '.venv', 'build', 'target', '.mypy_cache'}
SKIP_FILES = {'package-lock.json', '.env', '.DS_Store', 'yarn.lock', 'pnpm-lock.yaml', 'push.py'}

def api(method, path, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f"{URL}{path}", data=body, method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "push")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        raise

print(f"📦 {REPO}  {BRANCH}")

# 1. 获取最新 commit
print("⏳ 获取最新 commit...")
try:
    ref = api("GET", f"/git/refs/heads/{BRANCH}")
    parent = ref["object"]["sha"]
    base_tree = api("GET", f"/git/commits/{parent}")["tree"]["sha"]
    print(f"  最新 commit: {parent[:12]}")
except:
    print("  空仓库，创建初始 commit")
    parent, base_tree = None, None

# 2. 读文件
print("⏳ 读取文件...")
files = []
for root, dirs, names in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for name in names:
        if name in SKIP_FILES: continue
        p = os.path.join(root, name)
        rp = os.path.relpath(p, ROOT).replace('\\', '/')
        with open(p, 'rb') as fh:
            files.append((rp, fh.read()))
files.sort()
print(f"  共 {len(files)} 个文件")

# 3. 创建 Blobs
print("⏳ 创建 blobs...")
tree = []
for i, (path, content) in enumerate(files):
    try:
        blob = {"content": content.decode(), "encoding": "utf-8"}
    except UnicodeDecodeError:
        blob = {"content": base64.b64encode(content).decode(), "encoding": "base64"}
    r = api("POST", "/git/blobs", blob)
    tree.append({"path": path, "mode": "100644", "type": "blob", "sha": r["sha"]})
    if (i+1) % 20 == 0 or i == len(files)-1:
        print(f"  {i+1}/{len(files)}")

# 4. 创建 Tree
print("⏳ 创建 tree...")
payload = {"tree": tree}
if base_tree: payload["base_tree"] = base_tree
t = api("POST", "/git/trees", payload)
print(f"  tree: {t['sha'][:12]}")

# 5. 创建 Commit
print("⏳ 创建 commit...")
c = api("POST", "/git/commits", {
    "message": MSG, "tree": t["sha"],
    "parents": [parent] if parent else [],
    "author": {"name": "campus-forum", "email": "dev@campus.local"},
})
print(f"  commit: {c['sha'][:12]}")

# 6. 推送
print(f"⏳ 推送到 {BRANCH}...")
api("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": c["sha"], "force": True})
print(f"\n✅ 推送成功！https://github.com/{REPO}/commit/{c['sha']}")
