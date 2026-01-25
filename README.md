# Rekall

**Remember where you were** — Context recovery CLI for developers.

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
- **Smart Analysis** — Prioritizes FIXMEs over TODOs, new files over modified, and highlights blockers
- **JSON Output** — Pipe to other tools or build integrations
- **Zero Config** — Just run `rekall` in any git repository

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
```

### JSON Output

```bash
# Get JSON output for scripting
rekall --format json

# Pipe to jq
rekall --format json | jq '.analysis.blockers'
```

## Options

| Command | Option | Description |
|---------|--------|-------------|
| `context` | `-f, --format <format>` | Output format: `text` or `json` |
| `pr <number>` | `-r, --repo <repo>` | Repository in `owner/repo` format |
| `pr <number>` | `-f, --format <format>` | Output format: `text` or `json` |

## Requirements

- **Node.js 18+**
- **Git** — Must be run inside a git repository
- **GitHub CLI** (`gh`) — Required for PR analysis
  ```bash
  # Install GitHub CLI
  brew install gh      # macOS
  sudo apt install gh  # Ubuntu

  # Authenticate
  gh auth login
  ```

## How It Works

1. **Collects Context** — Gathers data from git (branch, commits, changes, stashes) and scans code for TODOs/FIXMEs
2. **Analyzes** — Prioritizes information and generates smart suggestions
3. **Renders** — Displays a clean, scannable summary

## Development

```bash
# Clone the repo
git clone https://github.com/yourusername/rekall.git
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

## Project Structure

```
rekall/
├── bin/
│   └── rekall.js           # CLI entry point
├── src/
│   ├── cli/                # Command-line interface
│   │   ├── commands/       # Command handlers
│   │   ├── index.ts        # CLI setup
│   │   └── renderer.ts     # Output formatting
│   ├── collectors/         # Data gathering
│   │   ├── git.ts          # Git context
│   │   ├── github.ts       # GitHub PR data
│   │   └── code.ts         # Code analysis
│   ├── engine/             # Core logic
│   │   ├── context.ts      # Context orchestration
│   │   └── synthesizer.ts  # Analysis engine
│   ├── utils/              # Utilities
│   └── types/              # TypeScript types
└── tests/                  # Test files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

---

**Built with caffeine and context switches.**
