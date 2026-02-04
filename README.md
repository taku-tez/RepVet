# RepVet 🔍

Maintainer reputation checker for **12 package ecosystems**. Part of the **xxVet** security CLI series.

[![npm version](https://img.shields.io/npm/v/repvet.svg)](https://www.npmjs.com/package/repvet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why?

Supply chain attacks often exploit:
- 📦 **Abandoned packages** with no maintainer activity
- 🔄 **Ownership transfers** to malicious actors
- 🦠 **Packages with malware history** (event-stream, colors, etc.)
- ⚠️ **Deprecated packages** still in use

RepVet helps you identify risky dependencies before they become a problem.

## Supported Ecosystems

| Ecosystem | Language | Registry | Deprecated | Ownership | Vulns |
|-----------|----------|----------|------------|-----------|-------|
| npm | JavaScript/TypeScript | npmjs.com | ✅ | ✅ | ✅ OSV |
| PyPI | Python | pypi.org | ✅ yanked | ✅ | ✅ OSV |
| crates.io | Rust | crates.io | ✅ yanked | ✅ | ✅ OSV |
| RubyGems | Ruby | rubygems.org | ✅ yanked | ❌ | ✅ OSV |
| Go | Go | proxy.golang.org | ✅ retracted | ❌ | ✅ OSV |
| Packagist | PHP | packagist.org | ✅ abandoned | ✅ | ✅ OSV |
| NuGet | .NET | nuget.org | ✅ | ✅ | ✅ OSV |
| Maven | Java/Kotlin | maven.org | ❌ | ❌ | ✅ OSV |
| Hex | Elixir/Erlang | hex.pm | ✅ retired | ❌ | ✅ OSV |
| pub.dev | Dart/Flutter | pub.dev | ✅ discontinued | ❌ | ✅ OSV |
| CPAN | Perl | metacpan.org | ❌ | ❌ | ✅ OSV |
| CocoaPods | Swift/ObjC | cocoapods.org | ✅ | ❌ | ✅ OSV |

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
# → Score: 95/100 (LOW risk)

# crates.io
repvet check serde -e crates
# → Score: 97/100 (LOW risk)

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
```

### Scan dependency files

```bash
# npm
repvet scan ./package.json

# Python
repvet scan ./requirements.txt

# Rust
repvet scan ./Cargo.toml

# Ruby
repvet scan ./Gemfile

# Go
repvet scan ./go.mod

# PHP
repvet scan ./composer.json

# .NET
repvet scan ./MyProject.csproj

# Java Maven
repvet scan ./pom.xml

# Java Gradle
repvet scan ./build.gradle

# Elixir
repvet scan ./mix.exs

# Dart/Flutter
repvet scan ./pubspec.yaml

# Perl
repvet scan ./cpanfile

# Swift/Objective-C
repvet scan ./Podfile

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
| Security holding package | -50 | npm replaced malicious package |
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
```

## Environment Variables

- `GITHUB_TOKEN`: Optional GitHub token for higher API rate limits

## Related Tools

- [AgentVet](https://github.com/taku-tez/agentvet) - AI agent security scanner
- [PermitVet](https://github.com/taku-tez/PermitVet) - Cloud IAM scanner
- [SubVet](https://github.com/taku-tez/SubVet) - Subdomain takeover scanner
- [ReachVet](https://github.com/taku-tez/ReachVet) - Reachability analyzer

## License

MIT
