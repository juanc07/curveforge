# CurveForge — Source Snapshot & Milestone Handoff Policy

**Status:** Development operating procedure  
**Repository:** https://github.com/juanc07/curveforge  
**Primary branch:** `main`  
**Local repository (Git Bash):** `/c/2026/MeteoraHackaton/curveforge`  
**Snapshot destination:** `/c/Users/USER/Downloads/`  
**Applies to:** Every successfully tested and committed milestone, and each new development-chat handoff

## 1. Purpose

GitHub `main` is CurveForge's **single source of truth**. A ZIP snapshot is a portable, point-in-time copy of a **specific committed revision** for ChatGPT Project Sources and developer handoffs. Snapshots **do not replace GitHub**, and should never contain private credentials.

This procedure ensures that new chats and developers use the correct code rather than older snapshots or chat history.

## 2. Source-of-truth order

1. Current, tested and pushed GitHub `main` commit.
2. Newest verified ZIP snapshot exported from that exact commit, when direct repository access is unavailable.
3. Current repository documentation in `docs/`.
4. Dated handoff documents for decisions and history.
5. Older ZIP snapshots for backup/reference **only**.

If the snapshot and repository differ, prefer the committed GitHub source and create a fresh snapshot. When SDK APIs differ, verify against the **installed** `@meteora-ag/dynamic-bonding-curve-sdk` version and its TypeScript declarations.

## 3. Milestone completion gate

Before creating a source snapshot:

- [ ] New functionality has been tested in the actual local app; errors and limitations are recorded.
- [ ] `npm run build` passes, including TypeScript checks.
- [ ] Changes to source and applicable `docs/` files are reviewed.
- [ ] `docs/CHANGELOG.md` and `docs/PROJECT_STATUS.md` reflect the milestone (create them if missing).
- [ ] No `.env.local`, seed phrases, private keys, tokens, or other secrets are committed.
- [ ] All intended changes are committed; `git status` shows a clean working tree.
- [ ] The commit has been pushed successfully to `origin/main`.

If a gate fails, **do not label the milestone finished or export it as the latest authoritative snapshot**. Resolve the issue first or explicitly mark the snapshot as provisional.

## 4. Standard Git Bash procedure

Run these commands **from Git Bash on your Windows development machine**. Copy **commands only**, not the expected terminal output.

### A. Inspect and synchronize

```bash
cd /c/2026/MeteoraHackaton/curveforge

git status
git pull --ff-only origin main
git log -1 --oneline
```

**Stop if there are uncommitted changes or the pull fails.** Review and resolve these before continuing. Never force-push to make the snapshot command succeed.

### B. Confirm the production build

Stop any running dev server if needed, then:

```bash
npm run build
```

A successful compile alone is not runtime verification. Ensure the milestone's documented manual/SDK tests were also completed.

### C. Confirm clean tree and check tracked secrets

```bash
git status --short

git ls-files | grep -Ei '(^|/)(\.env(\.|$)|.*(private.?key|seed.?phrase|secret).*)' || true
```

The grep is an **aid, not a complete secret scan**. Review suspicious tracked paths and file contents; never share a snapshot with secrets embedded in otherwise innocent-looking files. If `git status --short` prints unexpected entries, stop and review them.

### D. Export the committed source

```bash
git archive --format=zip \
  --output=/c/Users/USER/Downloads/curveforge-source-latest.zip \
  HEAD
```

This exports tracked files in `HEAD`. It excludes untracked and ignored files (normally `.env.local`, `node_modules`, and `.git`) but **includes any secrets that were mistakenly committed**.

### E. Verify archive integrity and docs

```bash
unzip -t /c/Users/USER/Downloads/curveforge-source-latest.zip | tail -1

unzip -l /c/Users/USER/Downloads/curveforge-source-latest.zip | grep 'docs/'

git rev-parse --short HEAD
```

Expect `No errors detected in compressed data` and a listing of committed `docs/` files. If no `docs/` files appear, stop and investigate whether they were committed.

### F. Record the exact snapshot revision

Record the `git rev-parse --short HEAD` value in the milestone handoff or ChatGPT source description. For traceability, you may create an additional revision-named ZIP:

```bash
REV=$(git rev-parse --short HEAD)
git archive --format=zip \
  --output="/c/Users/USER/Downloads/curveforge-source-${REV}.zip" \
  HEAD
```

The revision-named ZIP can be archived locally while `curveforge-source-latest.zip` is the convenience upload. Both refer to the same commit when created together.

## 5. Update ChatGPT Project Sources

After the above checks:

1. Upload the newly generated `curveforge-source-latest.zip` into the CurveForge ChatGPT Project's **Sources**.
2. Verify the new upload appears and is readable.
3. Make its Git commit ID clear in the new-chat handoff text.
4. Once confirmed, remove older *active Project Sources* snapshots that could cause ambiguity. Retain historical backups locally or in versioned release storage.
5. Keep the project handoff, onboarding policy, architecture references, and appropriate Meteora SDK documentation available.
6. For the first chat after handoff, state that **the newly exported snapshot is the working baseline**, while GitHub `main` remains authoritative.

Do not assume the ChatGPT Project Sources automatically sync when new GitHub commits are pushed: the uploaded ZIP is a fixed snapshot and must be replaced after each milestone/handoff.

## 6. Suggested handoff note (copy and fill in)

> CurveForge development continues from GitHub `juanc07/curveforge`, `main`, commit `<COMMIT_HASH>`. The latest uploaded `curveforge-source-latest.zip` was generated using `git archive HEAD` after a successful build and runtime checks. Use it as the working source snapshot; treat earlier snapshots as historical backups. Read `docs/` and the current handoff before editing. Deliver small downloadable ZIP patches that include source and documentation changes. Do not claim a milestone complete until local tests pass and GitHub is clean and synchronized.

## 7. Responsibilities for each future milestone

**Assistant / developer:** Inspect the latest code, use verified SDK types, provide a small ZIP patch with necessary `docs/` updates, state tests performed and limitations, and supply Git Bash install and commit commands.

**Local project owner:** Extract the patch, run build and runtime tests, review staged changes and secrets, commit/push, and create the latest source snapshot after success.

**No extra infrastructure required:** This is a Git + Git Bash + ZIP workflow. Never upload `.env.local`, wallet secrets, or API credentials to ChatGPT Project Sources.

## 8. When to make a snapshot

**Create a fresh snapshot:** after completing and pushing each substantial milestone, before switching to a new ChatGPT conversation, or when requesting a major repository-wide audit.

**Usually skip a fresh snapshot:** after a trivial uncommitted local tweak, a failed patch, or a milestone that has not yet passed runtime testing.

## 9. Quick checklist

- [ ] Tests and build passed
- [ ] Documentation updated and committed
- [ ] No secrets in tracked files or archive
- [ ] `git status` clean; `origin/main` synchronized
- [ ] `git archive HEAD` completed
- [ ] ZIP integrity and `docs/` inclusion checked
- [ ] Commit hash recorded
- [ ] ChatGPT Project Sources updated, older snapshots retired

**Key rule:** A new ZIP snapshot is a verified *output* of a completed milestone—not the milestone's source of truth. GitHub history remains authoritative.
