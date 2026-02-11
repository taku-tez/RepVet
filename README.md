# RepVet 🔍

Maintainer reputation checker for **14 package ecosystems**. Part of the **xxVet** security CLI series.

[![npm version](https://img.shields.io/npm/v/repvet.svg)](https://www.npmjs.com/package/repvet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why?

Supply chain attacks often exploit:
- 📦 **Abandoned packages** with no maintainer activity
- 🔄 **Ownership transfers** to malicious actors
- 🦠 **Packages with malware history** (event-stream, colors, etc.)
- ⚠️ **Deprecated packages** still in use
- 🔓 **Archived repositories** no longer maintained

RepVet helps you identify risky dependencies before they become a problem.

## Features

- **14 Ecosystem Support**: npm, PyPI, crates.io, RubyGems, Go, Packagist, NuGet, Maven, Hex, pub.dev, CPAN, CocoaPods, Conda (+ uv)
- **10 Lockfile Formats**: package-lock.json, yarn.lock, pnpm-lock.yaml, poetry.lock, Pipfile.lock, Cargo.lock, Gemfile.lock, composer.lock, mix.lock, uv.lock
- **Version-aware Vulnerability Matching**: OSV queries use actual dependency versions for precise CVE matching
- **Monorepo & Directory Scanning**: Recursively scan entire project directories
- **Multi-VCS Support**: GitHub, GitLab, and Bitbucket repository analysis
- **Archived Repository Detection**: Flags unmaintained projects
- **pyproject.toml Support**: PEP 621 and Poetry formats
- **Concurrent API Requests**: Configurable parallelism for faster scans

## Supported Ecosystems

| Ecosystem | Language | Registry | Deprecated | Ownership | Vulns | Archive |
|-----------|----------|----------|------------|-----------|-------|---------|
| npm | JavaScript/TypeScript | npmjs.com | ✅ | ✅ | ✅ OSV | ✅ |
| PyPI | Python | pypi.org | ✅ yanked | ✅ | ✅ OSV | ✅ |
| crates.io | Rust | crates.io | ✅ yanked | ✅ | ✅ OSV | ✅ |
| RubyGems | Ruby | rubygems.org | ✅ yanked | ✅ | ✅ OSV | ✅ |
| Go | Go | proxy.golang.org | ✅ deprecated/retract | ✅ | ✅ OSV | ✅ |
| Packagist | PHP | packagist.org | ✅ abandoned | ✅ | ✅ OSV | ✅ |
| NuGet | .NET | nuget.org | ✅ | ✅ | ✅ OSV | ✅ |
| Maven | Java/Kotlin | maven.org | ✅ relocation | ❌ | ✅ OSV | ✅ |
| Hex | Elixir/Erlang | hex.pm | ✅ retired | ✅ | ✅ OSV | ✅ |
| pub.dev | Dart/Flutter | pub.dev | ✅ discontinued | ✅ | ✅ OSV | ✅ |
| CPAN | Perl | metacpan.org | ✅ | ✅ | ✅ OSV | ✅ |
| CocoaPods | Swift/ObjC | cocoapods.org | ✅ | ✅ | ✅ OSV | ✅ |
| Conda | Python/R/Data Science | anaconda.org | ❌ | ✅ | ❌ * | ✅ |

\* **Conda vulnerability limitation**: No free, OSS vulnerability database exists for Conda packages. Anaconda's CVE curation is a commercial feature. For Python packages distributed via Conda, consider also scanning the corresponding `requirements.txt` with PyPI ecosystem for vulnerability coverage.

## Supported Dependency Files

| File | Ecosystem | Lockfile | Version Info |
|------|-----------|----------|--------------|
| package.json | npm | ❌ | Ranges |
| package-lock.json | npm | ✅ | ✅ Exact |
| yarn.lock | npm | ✅ | ✅ Exact |
| pnpm-lock.yaml | npm | ✅ | ✅ Exact |
| requirements.txt | PyPI | ❌ | Partial |
| pyproject.toml | PyPI | ❌ | Ranges |
| poetry.lock | PyPI | ✅ | ✅ Exact |
| Pipfile.lock | PyPI | ✅ | ✅ Exact |
| Cargo.toml | crates.io | ❌ | Ranges |
| Cargo.lock | crates.io | ✅ | ✅ Exact |
| Gemfile | RubyGems | ❌ | Ranges |
| Gemfile.lock | RubyGems | ✅ | ✅ Exact |
| go.mod | Go | ❌ | ✅ Exact |
| composer.json | Packagist | ❌ | Ranges |
| composer.lock | Packagist | ✅ | ✅ Exact |
| pom.xml | Maven | ❌ | Ranges |
| build.gradle | Maven | ❌ | Ranges |
| build.gradle.kts | Maven | ❌ | Ranges |
| mix.exs | Hex | ❌ | Ranges |
| mix.lock | Hex | ✅ | ✅ Exact |
| pubspec.yaml | pub.dev | ❌ | Ranges |
| pubspec.lock | pub.dev | ✅ | ✅ Exact |
| cpanfile | CPAN | ❌ | Ranges |
| Podfile | CocoaPods | ❌ | Ranges |
| Podfile.lock | CocoaPods | ✅ | ✅ Exact |
| bun.lock | npm | ✅ | ✅ Exact |
| uv.lock | PyPI | ✅ | ✅ Exact |
| environment.yml | Conda + PyPI | ❌ | Partial |

## Quick Start

```bash
npx repvet --help
```

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
# → Score: 32/100 (CRITICAL risk)
#   -50: Past malware incident: Bitcoin wallet stealer (2018)
#   -15: Last commit over 3 years ago
#   -5: Single maintainer

# PyPI
repvet check requests -e pypi

# crates.io
repvet check serde -e crates

# RubyGems
repvet check rails -e rubygems

# Go modules
repvet check github.com/gin-gonic/gin -e go

# PHP Composer
repvet check laravel/framework -e packagist

# .NET
repvet check Newtonsoft.Json -e nuget

# Java/Kotlin
repvet check org.apache.commons:commons-lang3 -e maven

# Elixir
repvet check phoenix -e hex

# Dart/Flutter
repvet check http -e pub

# Perl
repvet check Moose -e cpan

# Swift/Objective-C
repvet check Alamofire -e cocoapods

# Conda (Python/R data science)
repvet check numpy -e conda
```

### Scan dependency files

```bash
# Single file
repvet scan ./package.json
repvet scan ./requirements.txt
repvet scan ./pyproject.toml
repvet scan ./Cargo.toml

# Directory scan (monorepo support)
repvet scan ./project/
# → Recursively finds all dependency files

# With threshold filter
repvet scan ./package.json --threshold 80

# CI mode (exit 1 if any package below score)
repvet scan ./package.json --fail-under 50

# Concurrent API requests (default: 5)
repvet scan ./package.json --concurrency 10

# Show skipped packages with reasons
repvet scan ./package.json --show-skipped

# JSON output
repvet scan ./package.json --json
```

### Advanced examples

```bash
# Scan entire monorepo
repvet scan ./my-monorepo/
# → Scans package.json, requirements.txt, Cargo.toml, etc. in all subdirectories

# Python project with pyproject.toml
repvet scan pyproject.toml
# → Parses PEP 621 and Poetry dependency formats

# Parallel execution for large projects
repvet scan package.json --concurrency 10

# Debug failed lookups
repvet scan package.json --show-skipped
# → Shows "not found" or "API error" for each skipped package

# Lockfile with version-aware vulnerability matching
repvet scan package-lock.json
# → Uses exact versions for precise OSV queries
```

### JSON output

```bash
repvet check lodash --json
repvet scan ./package.json --json
```

### SARIF output

Export results in [SARIF v2.1.0](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) format for integration with GitHub Code Scanning, Azure DevOps, and other SARIF-compatible tools:

```bash
repvet scan ./package.json --sarif > results.sarif
repvet scan . --sarif --fail-under 50 > results.sarif
```

Upload to GitHub Code Scanning:

```yaml
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

### CSV output

Export results in [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180) CSV format for spreadsheets, databases, or custom analysis:

```bash
repvet scan ./package.json --csv > results.csv
repvet scan . --csv --fail-under 50 > results.csv
```

CSV columns include: `package`, `ecosystem`, `score`, `risk_level`, `maintainers`, `deduction_count`, `deduction_reasons`, `deduction_points_total`, `vuln_total`, `vuln_critical`, `vuln_high`, `vuln_recent`, `vuln_unfixed`, `has_ownership_transfer`, `has_malware_history`, `is_deleted`, `last_commit_date`.

## Scoring

RepVet uses a **deduction-based** scoring system starting at 100:

| Check | Deduction | Notes |
|-------|-----------|-------|
| Past malware incident | -50 | Known supply chain attacks |
| Security holding package | -50 | npm replaced malicious package |
| Archived repository | -15 | No longer maintained |
| Critical vulns in history | -15 | From OSV database |
| Ownership transfer | -15 | Suspicious rapid changes |
| High severity vulns | -10 | From OSV database |
| Deprecated package | -10 | npm deprecated flag |
| Unfixed vulnerabilities | -10 | Adjusted by confidence |
| Last commit > 3 years | -15 | — |
| Last commit > 2 years | -10 | — |
| Last commit > 1 year | -5 | — |
| Single maintainer | -5 | Bus factor risk |
| Many recent vulns (3+/year) | -5 | — |

### Confidence-adjusted scoring

Deductions are adjusted by confidence level:
- **High**: 100% of points
- **Medium**: 75% of points  
- **Low**: 50% of points

Established projects (high downloads, many releases) get lower confidence penalties.

## Risk Levels

| Score | Risk | Action |
|-------|------|--------|
| 80-100 | LOW | ✅ Generally safe |
| 60-79 | MEDIUM | ⚠️ Review before use |
| 40-59 | HIGH | 🔴 Avoid if possible |
| 0-39 | CRITICAL | ❌ Do not use |

## Malware Database

RepVet includes a database of 30+ known malicious packages across multiple ecosystems:

**npm:**
- Supply chain attacks: event-stream, coa, rc, ua-parser-js
- Typosquatting: crossenv, mongose, loadsh, babelcli
- Sabotage: colors, faker
- Protestware: node-ipc

**PyPI:**
- num2words (malicious versions 0.5.15/0.5.16 in 2025)

**crates.io:**
- faster_log (typosquat of fast_log - crypto wallet stealer)

## CI Integration

```yaml
# GitHub Actions
- name: Check dependencies
  run: |
    npm install -g repvet
    repvet scan ./package.json --fail-under 60

# Multiple ecosystems
- name: Check all dependencies
  run: |
    repvet scan ./package.json --fail-under 60
    repvet scan ./requirements.txt --fail-under 60
    repvet scan ./Cargo.toml --fail-under 60

# Monorepo scan
- name: Scan entire repository
  run: |
    npm install -g repvet
    repvet scan . --fail-under 50
```

## Environment Variables

- `GITHUB_TOKEN`: Optional GitHub token for higher API rate limits (recommended for CI)

## Related Tools

- [AgentVet](https://github.com/taku-tez/agentvet) - AI agent security scanner
- [PermitVet](https://github.com/taku-tez/PermitVet) - Cloud IAM scanner
- [SubVet](https://github.com/taku-tez/SubVet) - Subdomain takeover scanner
- [ReachVet](https://github.com/taku-tez/ReachVet) - Reachability analyzer

## Part of xxVet Series

xxVet is a collection of 15 focused security CLI tools. See [full catalog](https://www.notion.so/xxVet-CLI-304b1e6bcbc2817abe62d4aecee9914a).

## License

MIT
