# RepVet 🔍

Maintainer reputation checker for npm packages. Part of the **xxVet** security CLI series.

## Why?

Supply chain attacks often exploit abandoned packages or transferred ownership. RepVet helps you identify risky dependencies before they become a problem.

## Installation

```bash
npm install -g repvet
```

## Usage

### Check a single package

```bash
repvet check lodash
# → Score: 100/100 (LOW risk)
# → Maintainers: jdalton

repvet check event-stream
# → Score: 50/100 (MEDIUM risk)
# → Deductions:
#   -50: Past malware incident: Bitcoin wallet stealer (2018)
```

### Scan package.json

```bash
repvet scan ./package.json

# Only show packages below score 80
repvet scan ./package.json --threshold 80

# Fail CI if any package scores below 50
repvet scan ./package.json --fail-under 50
```

### JSON output

```bash
repvet check lodash --json
repvet scan ./package.json --json
```

## Scoring

RepVet uses a **deduction-based** scoring system starting at 100:

| Check | Deduction |
|-------|-----------|
| Last commit > 1 year ago | -10 |
| Package ownership transferred | -20 |
| Past malware incident | -50 |

## Risk Levels

| Score | Risk |
|-------|------|
| 80-100 | LOW |
| 50-79 | MEDIUM |
| 0-49 | HIGH |

## Environment Variables

- `GITHUB_TOKEN`: Optional GitHub token for higher API rate limits

## Related Tools

- [AgentVet](https://github.com/taku-tez/agentvet) - AI agent security scanner
- [PermitVet](https://github.com/taku-tez/PermitVet) - Cloud IAM scanner
- [SubVet](https://github.com/taku-tez/SubVet) - Subdomain takeover scanner
- [ReachVet](https://github.com/taku-tez/ReachVet) - Reachability analyzer

## License

MIT
