# RepVet 🔍

Maintainer reputation checker for npm, PyPI, and crates.io packages. Part of the **xxVet** security CLI series.

## Why?

Supply chain attacks often exploit abandoned packages or transferred ownership. RepVet helps you identify risky dependencies before they become a problem.

## Installation

```bash
npm install -g repvet
```

## Usage

### Check a single package

```bash
# npm (default)
repvet check lodash
# → Score: 92/100 (LOW risk)

repvet check event-stream
# → Score: 22/100 (CRITICAL risk)
#   -50: Past malware incident: Bitcoin wallet stealer (2018)
#   -15: Last commit over 3 years ago
#   -5: Single maintainer

# PyPI
repvet check requests -e pypi
# → Score: 95/100 (LOW risk)

# crates.io
repvet check serde -e crates
# → Score: 95/100 (LOW risk)
```

### Scan dependency files

```bash
# package.json (npm)
repvet scan ./package.json

# requirements.txt (PyPI)
repvet scan ./requirements.txt

# Cargo.toml (Rust)
repvet scan ./Cargo.toml

# Filter by threshold
repvet scan ./package.json --threshold 80

# CI mode (exit 1 if any package below score)
repvet scan ./package.json --fail-under 50
```

### JSON output

```bash
repvet check lodash --json
repvet scan ./package.json --json
```

## Scoring

RepVet uses a **deduction-based** scoring system starting at 100:

| Check | Deduction | Notes |
|-------|-----------|-------|
| Past malware incident | -50 | Known supply chain attacks |
| Critical vulns in history | -15 | From OSV database |
| Ownership transfer | -15 | Suspicious rapid changes |
| High severity vulns | -10 | From OSV database |
| Unfixed vulnerabilities | -10 | Adjusted by confidence |
| Last commit > 3 years | -15 | - |
| Last commit > 2 years | -10 | - |
| Last commit > 1 year | -5 | - |
| Single maintainer | -5 | Bus factor risk |
| Many recent vulns (3+/year) | -5 | - |

### Confidence-adjusted scoring

Deductions are adjusted by confidence level:
- **High**: 100% of points
- **Medium**: 75% of points  
- **Low**: 50% of points

## Risk Levels

| Score | Risk |
|-------|------|
| 80-100 | LOW |
| 60-79 | MEDIUM |
| 40-59 | HIGH |
| 0-39 | CRITICAL |

## Ecosystems

| Ecosystem | Registry | Ownership Detection | Vuln History |
|-----------|----------|---------------------|--------------|
| npm | ✅ | ✅ | ✅ OSV |
| PyPI | ✅ | ❌ | ✅ OSV |
| crates.io | ✅ | ✅ | ✅ OSV |

## Environment Variables

- `GITHUB_TOKEN`: Optional GitHub token for higher API rate limits

## Related Tools

- [AgentVet](https://github.com/taku-tez/agentvet) - AI agent security scanner
- [PermitVet](https://github.com/taku-tez/PermitVet) - Cloud IAM scanner
- [SubVet](https://github.com/taku-tez/SubVet) - Subdomain takeover scanner
- [ReachVet](https://github.com/taku-tez/ReachVet) - Reachability analyzer

## License

MIT
