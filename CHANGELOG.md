# Changelog

All notable changes to RepVet will be documented in this file.

## [0.10.4] - 2026-02-08

### Added
- 20 high-download PyPI packages to popular-packages DB
- 13 legitimate package pairs to reduce typosquat false positives

## [0.10.3] - 2026-02-07

### Added
- `--quiet` and `--verbose` options for scan command
- PyPI typosquat detection
- Typosquat FP testing framework and expanded package database

### Fixed
- Reduced false positives in typosquat detection

## [0.10.2] - 2026-02-07

### Added
- `--ignore` option for pattern-based package filtering

### Fixed
- ESLint errors breaking CI

## [0.10.1] - 2026-02-06

### Added
- Typosquat detection command with multi-ecosystem support

## [0.10.0] - 2026-02-06

### Added
- SARIF v2.1.0 output format (`--sarif`)
- CSV output format (`--csv`)
- `uv.lock` parser for Python/uv ecosystem
- `bun.lock` parser for Bun ecosystem
- `Podfile.lock` parser for CocoaPods ecosystem
- `pubspec.lock` support for Dart/Flutter ecosystem
- `mix.lock` support for Elixir/Hex ecosystem
- `composer.lock` support for PHP/Packagist ecosystem

### Fixed
- Missing ownership checks for RubyGems, Hex, Pub

## [0.9.2] - 2026-02-05

### Added
- Parallel scanning + test separation
- `requirements.txt` recursive includes (`-r`, `-c`) support
- Externalized malware DB + fixed User-Agent version
- GitLab and Bitbucket support for last commit detection
- `package.json` full dependency type support + skip reason output
- Archived repository deduction to scoring
- Version extraction in lock file parsers for precise OSV matching

### Fixed
- pnpm-lock.yaml parser robustness
- Gemfile.lock routing to dedicated parser

### Changed
- Extracted lockfile parsers to `src/parsers/`

## [0.9.1] - 2026-02-04

### Added
- 12 hash validation campaign malware packages
- Lotus Bail WhatsApp stealer + Lazarus Group campaign packages (total: 131)
- 13 NuGet malware packages from ReversingLabs 2026 report
- n8n ecosystem and AI hallucination packages

### Fixed
- 5 FB items from Notion
- 4 additional FB items

## [0.9.0] - 2026-02-03

### Added
- Maven relocation and CPAN deprecated detection
- Ownership transfer detection for CocoaPods, CPAN, Conda, Hex, Pub
- Conda ecosystem support (13th ecosystem)
- Yanked/deprecated and ownership transfer detection for PyPI, NuGet, Go, Pub, crates.io, RubyGems

## [0.8.0] - 2026-02-02

### Added
- NuGet/Maven malware detection + deleted package support
- 2026 PyPI RAT packages to malware DB
- NodeCordRAT packages to malware DB
- Shai-Hulud V1.0 and V3.0 malware packages
- npm security holding package detection
- Ethereum smart contract malware detection

### Improved
- CVSS severity parsing from vector strings
- Cross-ecosystem malware detection (not just npm)

## [0.7.0] - 2026-02-01

### Added
- 12 ecosystems (ReachVet parity)
- Pub.dev maintainer extraction via `/publisher` endpoint

## [0.6.0] - 2026-01-31

### Added
- PHP (Packagist) and .NET (NuGet) support — 7 ecosystems total

## [0.5.0] - 2026-01-31

### Added
- RubyGems and Go modules support

## [0.4.0] - 2026-01-30

### Added
- Deprecated package detection
- PyPI scoring improvements

## [0.3.0] - 2026-01-30

### Added
- Improved accuracy for established projects

## [0.2.0] - 2026-01-29

### Added
- Improved scoring system
- Multi-ecosystem foundation

## [0.1.0] - 2026-01-29

### Added
- Initial release
- npm ecosystem support
- OSV vulnerability checking
- Malware database
- Reputation scoring
