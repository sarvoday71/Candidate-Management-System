# How I Used AI to Build This Project

I built the Candidate Management System (Spring Boot API, PostgreSQL, React UI) with an AI coding assistant, Claude Code. I'm comfortable in NestJS but new to Spring Boot, so the assistant helped me learn the framework while I built something real. This is a short, honest account of how I worked with it: what went well, what it got wrong, and the habits that kept the result trustworthy.

## 1. How I worked

I built the project in small steps, one request at a time, and ran each result before moving on:

1. Asked how to start a Spring Boot project, then generated it from the command line.
2. Connected it to a Neon PostgreSQL database and defined the schema with Prisma.
3. Added CRUD endpoints, then search, then five more filters.
4. Built the React and Tailwind frontend and reorganized the repo into `backend/` and `frontend/`.
5. Asked it to think about how to make the schema and queries handle more load, and to implement that.
6. Added a README, screenshots, automated tests, a technical design document and this guide.

I chose the stack and the direction (Neon, Prisma, React with Tailwind). The assistant did the typing, the investigating and a lot of the checking.

## 2. What worked well for me

| Task | How the AI helped | Why it worked |
|---|---|---|
| Learning Spring Boot | Explained concepts in NestJS terms (controllers, services, pipes, exception filters) | I told it my background, so the explanations landed |
| Scaffolding and CRUD | Generated the layers, DTOs, validation and error handling in minutes | Familiar patterns and a clear stack |
| Performance work | Diagnosed the slow queries before changing anything, then benchmarked on 100,000 rows | I asked it to *think* about the problem first, then implement |
| Tests | Wrote 237 tests across backend and frontend, including a concurrency test | They run against a real PostgreSQL, so a pass means something |
| Docs | README, technical design, screenshot checklist | I wrote them after the code worked, so they describe what exists |

## 3. Where it went wrong, and how it got caught

| What happened | How it was caught | What I took from it |
|---|---|---|
| The skills filter compiled but failed when it ran (`text[] @> varchar[]`) | Running the app against the real database | A successful compile proves very little, so I run things |
| `skills=java,spring&skills=docker` silently matched nothing | A test written for exactly that combination | I ask for tests of combinations and edge cases, not only the happy path |
| Some first-draft tests had wrong expectations (an email with spaces, an index choice that depends on table size) | Running them and reading the failures | A failing test doesn't always mean the code is wrong, so I read both sides |
| The dashboard stats query was *not* faster after optimizing | The benchmark | I ask for measurements, and I accept the disappointing ones |
| A cleanup command stopped my running backend (it killed whatever held a port) | Reading the command output afterwards | I tell the assistant to stop only processes it started |
| Two of my screenshots showed my real email address and employer | The assistant pointed it out while checking the images | Screenshots and docs get a human review before they go public |
| It couldn't check the UI in a browser, because browser automation is blocked on my machine | It said so, and didn't work around the policy | I'd rather it report what it couldn't verify than pretend |

## 4. The rules I ended up following

1. **Give context first:** stack, versions, constraints (corporate laptop, no Docker, remote database) and what "done" means.
2. **Ask for a diagnosis before a fix.** "Think about how to optimize this, then implement it" gave better results than "make it faster".
3. **Work in small steps** and run the app or the tests after each one.
4. **Make it prove things.** I had it run the build, run the tests, call the endpoints and check the files exist, rather than accept "this should work".
5. **Keep tests honest.** A test that finds a real bug is the point. One bent to pass is worse than none.
6. **Keep the design decisions myself.** The assistant lays out options and trade-offs; I choose, and the reasons go into the design document.
7. **Review before anything leaves my machine,** including commits, pushes, screenshots and docs.
8. **Approve risky actions one at a time:** deleting data, changing the shared database, installing system-wide tools, pushing code.
9. **Ask what it didn't check.** It was candid about gaps, such as no browser testing and no CI.

## 5. Prompts that worked for me

| Goal | What I asked |
|---|---|
| Understand | "Explain how a request flows through this application, with an analogy to NestJS." |
| Design with trade-offs | "Think of how we can optimize the database schema and queries for higher load, and implement it in the backend." |
| Debug | "There was a build error after running `mvnw spring-boot:run`, could you check what went wrong?" |
| Verify | "Check if all the images are added correctly." |
| Quality | "Write automated tests for this application." |
| Bounded change | "Add these filters: location, skills, minimum experience, maximum experience, status." |

A specific, bounded request worked far better than a vague one, and pasting an error together with what I was doing worked better than the error alone.

## 6. My checklist before I commit AI-written code

- [ ] It builds, the tests pass, and I saw them run
- [ ] I can explain what each new file is for
- [ ] The new tests would fail if the feature broke
- [ ] No secrets, passwords or personal data in code, docs, logs or screenshots
- [ ] New dependencies are intentional (name, version, why)
- [ ] The docs match the behavior, including the limitations
- [ ] The diff contains nothing I didn't ask for

## 7. Security and privacy

- Credentials live in git-ignored files (`application-local.properties` and `.env`). Before I committed, the assistant scanned everything being added for passwords and connection strings, and found none.
- I treat anything I paste into a chat, and any file the assistant reads, as leaving my machine.
- The app still has **no authentication**. It's noted openly in the README and the design document, and it's the first thing I'd add before any real deployment.
- Still on my list: confirming my organization's rules on AI tools and on personal projects, since I work on this from a work laptop.

## 8. Where I still decide for myself

- Architecture choices, where the real constraints are in my head and not in the prompt.
- Security-sensitive code (authentication, permissions), which I'd want properly reviewed.
- Claims about the real world the assistant can't check, such as performance on my real data.
- Anything I couldn't explain or maintain without it.

## 9. What I learned

The best results came from a loop: **ask, build small, run it for real, read the failures, fix, measure, document.** The AI made every step of that loop faster, and the judgment inside it stayed with me.
