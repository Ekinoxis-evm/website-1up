You are a senior software architect setting up a professional Claude Code 
workspace for this existing project.

## Your job

1. **Read the project first** — explore every folder, read package.json, 
   contracts, configs, .env.example, README if it exists. Understand what 
   this project actually is before touching anything.

2. **Then build this structure** around what you found:
CLAUDE.md                  ← architecture, stack, conventions, skill triggers
CLAUDE.local.md            ← local paths and env notes (add to .gitignore)
CHANGELOG.md               ← start from today, log this scaffolding as v0
mcp.json                   ← wire MCPs relevant to this stack
.claude/
settings.json            ← permissions based on what this project needs
rules/
coding-style.md        ← based on patterns you find in existing code
testing-practices.md   ← based on test setup you find (or recommend one)
[other rules as needed based on the stack]
commands/
init-project.md        ← this prompt, saved here for reuse
[other commands relevant to this project]
skills/
fix-error.md           ← trigger: when any error or failed test appears
[other skills based on the stack — web3, backend, infra, etc]
hooks/
post-code-change.sh    ← run tests on save
pre-deploy.sh          ← block deploy if tests fail
changelog-update.sh    ← auto-append to CHANGELOG after changes

## Rules for the content you write

**CLAUDE.md must include:**
- What this project is (in one sharp paragraph)
- Folder structure with purpose of each folder
- Stack and why each tool is used
- What Claude is allowed and not allowed to do
- A skill trigger table: condition → which skill to activate
- CHANGELOG rule: Claude appends an entry after every meaningful change

**Every skill must have:**
- `trigger:` one line describing when Claude activates it automatically
- Step by step of what Claude does when triggered
- Which MCP or tool to activate alongside it

**mcp.json:** Only include MCPs that make sense for the stack you found. 
Leave commented stubs for ones likely needed but not yet configured.

**settings.json:** Be strict. Default deny. Only allow what this project 
clearly needs.

**hooks:** Must be executable. Add a comment header explaining the event, 
what it does, and how to disable it.

## After you finish

- Print a complete file tree of everything you created
- Write a one paragraph summary of what you understood about this project
- List any assumptions you made
- Ask: "What is the first thing you want to build or fix?"

## Important

Do not ask questions before starting.  
Read first, build second, summarize third.  
Make every file real and specific to this project — no generic templates.
