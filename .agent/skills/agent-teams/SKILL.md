---
name: agent-teams
description: Instructions for orchestrating and coordinating teams of Claude Code agents (experimental).
---

# Agent Teams Orchestration

Coordinate multiple Claude Code instances working together as a team, with shared tasks, inter-agent messaging, and centralized management.

## Key Concepts

- **Team Lead**: The main session that creates the team and coordinates work.
- **Teammates**: Independent instances (Sonnet recommended) with their own context windows.
- **Shared Task List**: A central list where tasks are created, assigned, or self-claimed.
- **Mailbox**: Enables direct `message` and `broadcast` between agents.

## Use Cases

- **Parallel Code Review**: Different reviewers for security, performance, and tests.
- **Competing Hypotheses**: Adversarial investigation to avoid anchoring bias.
- **Cross-layer Coordination**: Separate owners for frontend, backend, and database changes.

## Commands and Workflow

### 1. Enable Feature
Set in `settings.json` or env:
```json
"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }
```

### 2. Starting a Team
Ask the Lead in natural language:
- "Create a team with 3 roommates to refactor these modules. Use Sonnet for each."
- "Spawn an architect teammate. Require plan approval before implementation."

### 3. Controlling the Team
- **Switching views**: Shift+Down (in-process mode).
- **Messaging**: `message <name> <content>` or `broadcast <content>`.
- **Termination**: "Ask the researcher teammate to shut down."
- **Cleanup**: "Clean up the team" (run from Lead).

## Best Practices

- **Context**: Teammates don't inherit lead history; pass critical details in the spawn prompt.
- **Task Sizing**: 5-6 tasks per teammate is ideal.
- **Quality Gates**: Use hooks like `TeammateIdle` or `TaskCompleted` for enforcement.
- **Conflict Prevention**: Ensure teammates own different sets of files.

## Limitations (Experimental)

- No session resumption for in-process teammates.
- Tasks might lag in status updates.
- One team per session; Lead is fixed.
- Permissions are inherited at spawn.
