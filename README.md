# Rekall

**Remember where you were** — Context recovery CLI for developers, powered by GitHub Copilot CLI.

Get back up to speed instantly after context switches, meetings, or a good night's sleep.

## The Problem

You step away from your code for a meeting, lunch, or the weekend. When you return:
- *"What branch was I on?"*
- *"What files did I change?"*
- *"What was I working on?"*
- *"What's left to do?"*

**Rekall** answers all of these in seconds.

## Features

- **Personal Context Mode** — See your branch, uncommitted changes, stashes, and TODOs at a glance
- **PR Review Mode** — Analyze pull requests before reviewing with risk assessment and smart questions
- **Explain Mode** — Ask GitHub Copilot CLI to explain what you've been working on recently
- **Smart Suggestions** — AI-powered commit messages and branch name suggestions via Copilot CLI
- **Smart Analysis** — Prioritizes FIXMEs over TODOs, new files over modified, and highlights blockers
- **JSON Output** — Pipe to other tools or build integrations
- **Zero Config** — Just run `rekall` in any git repository

## GitHub Copilot CLI Integration

Rekall uses **GitHub Copilot CLI** as its AI backend to provide intelligent analysis. Instead of using Copilot to write code, Rekall uses it as an **analysis engine** — sending structured prompts about your project state and receiving synthesized insights.

### How Copilot Powers Rekall

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────┐
│  Collectors  │ ──► │ Prompt       │ ──► │ GitHub Copilot  │ ──► │ Renderer │
│ (git, code)  │     │ Builder      │     │ CLI (gh copilot)│     │ (output) │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────┘
```

1. **Collect** — Gathers data from git (branch, commits, changes, stashes), scans code for TODOs/FIXMEs, and fetches PR metadata
2. **Build Prompt** — Constructs a structured prompt with all project context
3. **Analyze via Copilot** — Sends the prompt to `gh copilot` for AI-powered synthesis
4. **Render** — Parses the AI response and displays a clean, actionable summary

### Copilot Touchpoints

| Feature | How Copilot Is Used |
|---------|-------------------|
| `rekall context` | Synthesizes project state into summary, next steps, and blockers |
| `rekall pr <n>` | Analyzes PR changes for risk assessment and review guidance |
| `rekall explain` | Explains recent development work from commit history |
| `rekall suggest` | Generates commit messages and branch names from staged changes |

### With Copilot vs Without

Rekall works **with or without** GitHub Copilot CLI installed. When Copilot is available, you get AI-powered insights. Without it, Rekall falls back to intelligent rule-based analysis.

| Aspect | With Copilot | Without Copilot |
|--------|-------------|-----------------|
| Context summary | AI-synthesized, natural language | Rule-based pattern matching |
| Next step suggestions | Context-aware AI recommendation | Priority-based heuristic |
| PR risk assessment | AI-analyzed with reasoning | File size and type heuristics |
| Explain mode | Full AI explanation of work | Commit pattern analysis |
| Commit suggestions | AI-crafted messages | Convention-based templates |

When running without Copilot, a note is displayed:
```
Note: GitHub Copilot CLI not available, using basic analysis
Install: gh extension install github/gh-copilot
```

When Copilot is active:
```
✨ Powered by GitHub Copilot CLI
```

### Setup GitHub Copilot CLI

```bash
# Install GitHub CLI
brew install gh          # macOS
sudo apt install gh      # Ubuntu

# Authenticate
gh auth login

# Install GitHub Copilot CLI extension
gh extension install github/gh-copilot
```

## Installation

```bash
# Install globally (required for CLI)
npm install -g rekall-cli

# Or run directly with npx (no install needed)
npx rekall-cli
```

> **Note:** The `-g` flag is required to install as a global CLI command.

## Usage

### Personal Context

```bash
# Show context for current project
rekall

# Or explicitly
rekall context
```

**Output:**
```
📍 my-project
   Branch: feature/auth | Last active: 2 hours ago

────────────────────────────────────────────────────────────

📖 CONTEXT
   Working on branch "feature/auth" with 3 uncommitted changes.

📝 UNCOMMITTED CHANGES
   • src/auth/login.ts
   • src/auth/middleware.ts
   • tests/auth.test.ts

⚠️  BLOCKERS
   • FIXME in auth/login.ts:42 - Handle token expiration
   • TODO in auth/middleware.ts:15 - Add rate limiting

➡️  SUGGESTED NEXT STEP
   Review and commit changes to: src/auth/login.ts

────────────────────────────────────────────────────────────
✨ Powered by GitHub Copilot CLI
```

### PR Review Mode

```bash
# Analyze a PR in current repo
rekall pr 123

# Analyze a PR in a different repo
rekall pr 456 --repo owner/repo
```

**Output:**
```
🔍 PR #123: "Add user authentication"
   Author: @developer | 5 commits | 12 files | +450 -32

────────────────────────────────────────────────────────────

📖 SUMMARY
   PR #123: "Add user authentication" by @developer (5 commits, 482 lines changed)

🎯 REVIEW PRIORITY
   ⚠️  HIGH RISK (review carefully):
      • src/auth/middleware.ts
      • src/database/users.ts
   ✅ LOW RISK (skim):
      • tests/auth.test.ts
      • README.md

🤔 REVIEW QUESTIONS
   • Does this change have adequate test coverage?

🔗 LINK
   https://github.com/owner/repo/pull/123

────────────────────────────────────────────────────────────
✨ Powered by GitHub Copilot CLI
```

### Explain Recent Changes

```bash
# Explain what you've been working on (last 5 commits)
rekall explain

# Analyze more commits
rekall explain --commits 10
```

**Output:**
```
🔮 COPILOT EXPLANATION
────────────────────────────────────────────────────────────

  Recent development on branch "feature/auth":

  📝 5 commit(s) analyzed:
     • a1b2c3d - Add login endpoint (2 hours ago)
     • d4e5f6a - Add auth middleware (3 hours ago)
     • ...

  🎯 Work focus: new features, test updates.

────────────────────────────────────────────────────────────
✨ Powered by GitHub Copilot CLI
```

### Smart Suggestions

```bash
# Suggest commit messages for staged changes
rekall suggest

# Suggest branch names for a feature description
rekall suggest "add user authentication" --type branch
```

**Commit message output:**
```
💬 COMMIT MESSAGE SUGGESTIONS
────────────────────────────────────────────────────────────

  1. feat: add user authentication middleware
  2. feat: implement login and session management
  3. chore: add auth module with login endpoint

  Commit with: git commit -m "<message>"
────────────────────────────────────────────────────────────
✨ Powered by GitHub Copilot CLI
```

**Branch name output:**
```
🌿 BRANCH NAME SUGGESTIONS
────────────────────────────────────────────────────────────

  1. feature/user-authentication
  2. feat/user-auth
  3. feature/add-login

  Create with: git checkout -b <branch-name>
────────────────────────────────────────────────────────────
✨ Powered by GitHub Copilot CLI
```

### JSON Output

```bash
# Get JSON output for scripting
rekall --format json

# Pipe to jq
rekall --format json | jq '.analysis.blockers'

# JSON includes poweredBy field
rekall --format json | jq '.poweredBy'
# → "github-copilot" or "basic-analysis"
```

## Commands & Options

| Command | Option | Description |
|---------|--------|-------------|
| `context` | `-f, --format <format>` | Output format: `text` or `json` |
| `pr <number>` | `-r, --repo <repo>` | Repository in `owner/repo` format |
| `pr <number>` | `-f, --format <format>` | Output format: `text` or `json` |
| `explain` | `-n, --commits <number>` | Number of commits to analyze (default: 5) |
| `explain` | `-f, --format <format>` | Output format: `text` or `json` |
| `suggest [description]` | `-t, --type <type>` | Suggestion type: `commit` or `branch` |
| `suggest [description]` | `-f, --format <format>` | Output format: `text` or `json` |

## Requirements

- **Node.js 18+**
- **Git** — Must be run inside a git repository
- **GitHub CLI** (`gh`) — Required for PR analysis and Copilot integration
  ```bash
  # Install GitHub CLI
  brew install gh      # macOS
  sudo apt install gh  # Ubuntu

  # Authenticate
  gh auth login
  ```
- **GitHub Copilot CLI** (optional) — Enhances analysis with AI
  ```bash
  gh extension install github/gh-copilot
  ```

## Architecture

```
rekall/
├── bin/
│   └── rekall.js           # CLI entry point
├── src/
│   ├── cli/                # Command-line interface
│   │   ├── commands/       # Command handlers
│   │   │   ├── context.ts  # Personal context command
│   │   │   ├── pr.ts       # PR review command
│   │   │   ├── explain.ts  # Explain recent changes (Copilot)
│   │   │   └── suggest.ts  # Suggest commit/branch names (Copilot)
│   │   ├── index.ts        # CLI setup and routing
│   │   └── renderer.ts     # Output formatting (text/JSON)
│   ├── collectors/         # Data gathering
│   │   ├── git.ts          # Git context extraction
│   │   ├── github.ts       # GitHub PR data collection
│   │   └── code.ts         # TODO/FIXME and test analysis
│   ├── engine/             # Core logic
│   │   ├── context.ts      # Context orchestration
│   │   ├── synthesizer.ts  # Copilot CLI integration + fallback
│   │   └── prompt-builder.ts # Prompt engineering for Copilot
│   ├── utils/              # Utilities
│   │   ├── shell.ts        # Shell execution
│   │   └── config.ts       # Project detection
│   └── types/              # TypeScript type definitions
└── tests/                  # Unit tests (42 tests, 100% pass)
```

### Data Flow

```
User Command → Collectors → Engine → Copilot CLI → Renderer → Output
                  │              │         │              │
              git, code,    prompt      gh copilot    text or
              github       builder       (AI)         JSON
```

## Development

```bash
# Clone the repo
git clone https://github.com/Jasmin2895/rekall.git
cd rekall

# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

---

**Built with caffeine, context switches, and GitHub Copilot CLI.**
