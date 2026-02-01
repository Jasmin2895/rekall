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

- **Personal Context** — See your branch, uncommitted changes, stashes, and TODOs at a glance
- **PR Review** — Analyze pull requests with risk assessment and smart review questions
- **Explain** — AI-powered explanation of your recent development work
- **Suggest** — Generate commit messages and branch names from your changes
- **Onboard** — Quick project overview for newcomers (architecture, dependencies, hot areas)
- **JSON Output** — Pipe to other tools with `--format json`
- **Zero Config** — Just run `rekall` in any git repository

## Installation

```bash
npm install -g rekall-cli
```

## Requirements

- **Node.js 18+**
- **Git**
- **GitHub CLI** (`gh`) — [Install here](https://cli.github.com)
  ```bash
  gh auth login
  ```

## Usage

```bash
# Show project context (default)
rekall

# Analyze a PR before reviewing
rekall pr 123
rekall pr 456 --repo owner/repo

# Explain recent work
rekall explain
rekall explain --commits 10

# Suggest commit messages (stage files first)
rekall suggest

# Suggest branch names
rekall suggest "add user authentication" --type branch

# Quick project overview for newcomers
rekall onboard

# JSON output
rekall --format json
```

## Commands & Options

| Command | Option | Description |
|---------|--------|-------------|
| `context` | `-f, --format` | Output format: `text` or `json` |
| `pr <number>` | `-r, --repo` | Repository in `owner/repo` format |
| `pr <number>` | `-f, --format` | Output format: `text` or `json` |
| `explain` | `-n, --commits` | Number of commits to analyze (default: 5) |
| `suggest [desc]` | `-t, --type` | Suggestion type: `commit` or `branch` |
| `onboard` | `-f, --format` | Output format: `text` or `json` |

## GitHub Copilot CLI

Rekall uses `gh copilot` as its AI backend. It collects project context (git state, code, PRs) and sends structured prompts to Copilot CLI for intelligent analysis.

Works **with or without** Copilot CLI — falls back to smart rule-based analysis when unavailable.

## Development

```bash
git clone https://github.com/Jasmin2895/rekall.git
cd rekall
npm install
npm test
npm run build
```

## License

MIT
