# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repository is currently empty. It contains only a placeholder `README.md` (the single line `# elite-academy`) and no source code, build configuration, dependency manifests, tests, or tooling.

Because nothing has been established yet, there are no project-specific build, lint, test, or run commands to document, and no architecture to describe. Do not invent conventions, frameworks, or commands — none exist yet.

## Guidance for the first substantive change

When the user asks for the first real feature or scaffolding:

- Ask (or infer from the request) what stack is intended before generating files — the name "elite-academy" does not by itself imply a language, framework, or domain model.
- Once a stack is chosen and scaffolded, update this file with the actual build/test/run commands and a real architecture section. Remove this "Repository status" section at that point.

## Branch convention

Development for Claude Code sessions in this repo happens on the branch specified by the invoking task (e.g. `claude/add-claude-documentation-bf2Ot`). Create it locally if it does not exist, commit there, and push to the same branch on `origin`. Do not push to `main` without explicit instruction.
