0a. study .ralph/specs/* to learn about the application specifications.

0b. read .ralph/config.json at the beginning of each loop to understand configuration such as max iterations, fleet behaviour, and log file locations.

0c. read .ralph/logs/progress.txt at the beginning of each loop to understand what has been accomplished so far.

0d. read .ralph/logs/learnings.md at the beginning of each loop to load durable learnings from previous iterations.

0e. The source code of the application is in app/ and prisma/
CRITICAL: You must ONLY make changes within the car-work-tracker directory (the project root). Do not modify files outside of this project.

0f. study .ralph/fix_plan.md. Treat .ralph/fix_plan.md as the single source of truth for tasks; always pick the next task from this file and mark items as completed when done.

1. Your task is to implement missing functionality (see .ralph/specs/*) and produce a working Remix PWA application using parallel subagents. Follow .ralph/fix_plan.md and choose the most important 10 things. Before making changes search codebase (don't assume not implemented) using subagents. You may use up to 500 parallel subagents for all operations but only 1 subagent for build/tests.

2. After implementing functionality or resolving problems, run the tests or build (`npm run build`) for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Think hard.

2a. At the end of each loop iteration append a concise entry to .ralph/logs/progress.txt describing which tasks were attempted, which tasks were completed (including checkmarks applied in .ralph/fix_plan.md), and any notable results from tests or builds.

2b. When you learn something new that could help future iterations (for example, a build optimisation, a debugging trick, or a pattern that works well), append a new markdown section to .ralph/logs/learnings.md with a short heading and a few sentences capturing that learning.

3. When you discover a routing, Prisma, or UI issue. Immediately update .ralph/fix_plan.md with your findings using a subagent. When the issue is resolved, update .ralph/fix_plan.md and remove the item using a subagent.

4. When the build/tests pass update the .ralph/fix_plan.md, then add changed code and .ralph/fix_plan.md with "git add -A" via bash then do a "git commit" with a message that describes the changes you made to the code. After the commit do a "git push" to push the changes to the remote repository.

999. Important: When authoring code or components capture the why tests and the backing implementation is important in the documentation.

9999. Important: We want single sources of truth. If tests unrelated to your work fail then it's your job to resolve these tests as part of the increment of change.

999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1.

999999999. You may add extra logging if required to be able to debug the issues.

9999999999. ALWAYS KEEP .ralph/fix_plan.md up to date with your learnings using a subagent. Especially after wrapping up/finishing your turn.

99999999999. When you learn something new about how to run the app or build make sure you update .ralph/AGENT.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.

999999999999. IMPORTANT DO NOT IGNORE: The app should be authored in Remix (React/TypeScript).

99999999999999. IMPORTANT when you discover a bug resolve it using subagents even if it is unrelated to the current piece of work after documenting it in .ralph/fix_plan.md

9999999999999999999. Keep .ralph/AGENT.md up to date with information on how to build the app and your learnings to optimise the build/test loop using a subagent.

999999999999999999999. For any bugs you notice, it's important to resolve them or document them in .ralph/fix_plan.md to be resolved using a subagent.

99999999999999999999999999. When .ralph/fix_plan.md becomes large periodically clean out the items that are completed from the file using a subagent.

99999999999999999999999999. If you find inconsistencies in the .ralph/specs/* then use the oracle and then update the specs. Specifically around data models and routing.

9999999999999999999999999999. DO NOT IMPLEMENT PLACEHOLDER OR SIMPLE IMPLEMENTATIONS. WE WANT FULL IMPLEMENTATIONS. DO IT OR I WILL YELL AT YOU

9999999999999999999999999999999. SUPER IMPORTANT DO NOT IGNORE. DO NOT PLACE STATUS REPORT UPDATES INTO .ralph/AGENT.md

/fleet
