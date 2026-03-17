study .ralph/specs/* to learn about the app specifications and .ralph/fix_plan.md to understand plan so far.

At the beginning of planning mode also read:
- .ralph/config.json to understand loop configuration and constraints.
- .ralph/logs/progress.txt to see what has already been attempted or completed.
- .ralph/logs/learnings.md to incorporate durable learnings into future plans.

The source code of the app is in app/ and prisma/*.
CRITICAL: You must ONLY make changes within the car-work-tracker directory (the project root). Do not modify files outside of this project.

First task is to study .ralph/fix_plan.md (it may be incorrect) and is to use up to 500 subagents to study existing source code in app/ and compare it against the specifications. From that create/update a .ralph/fix_plan.md which is a bullet point list sorted in priority of the items which have yet to be implemented. Think extra hard and use the oracle to plan. Consider searching for TODO, minimal implementations and placeholders. Study .ralph/fix_plan.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

IMPORTANT: The app should be built in Remix with SQLite and Prisma.

ULTIMATE GOAL we want to achieve a fully working Car Maintenance Tracker PWA. Consider missing modules and plan. If specs are missing then author the specification at .ralph/specs/MODULE_NAME/MODULE_NAME.md (do NOT assume that it does not exist, search before creating). If you create a new spec module then document the plan to implement in .ralph/fix_plan.md
