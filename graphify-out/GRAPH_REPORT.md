# Graph Report - alonit  (2026-09-03)

## Corpus Check
- 95 files · ~86,736 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 522 nodes · 962 edges · 39 communities (30 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `961cdb8d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- What You Must Do When Invoked
- recommendation.service.ts
- OnboardingModal.tsx
- QuestionCard.tsx
- devDependencies
- dependencies
- מערכת דירוג שתיל-גזע-אלון 🌱🌳🌲
- compilerOptions
- [id]/page.tsx
- manifest.json
- seed-questions.mjs
- cloudinary.ts
- adminDb
- TrustScoreService
- CloudinaryUsageDashboard.tsx
- next.config.mjs
- next-env.d.ts
- tailwind.config.ts
- 🚀 התחלה מהירה - מערכת דירוג שתיל-גזע-אלון
- level-integration-examples.ts
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- מדריך סטיקרים ו-GIFs (Tenor מבית Google)
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- extraction-spec.md
- Header.tsx

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 48 edges
2. `getUserProfile()` - 23 edges
3. `db` - 22 edges
4. `getQuestionUrl()` - 16 edges
5. `compilerOptions` - 15 edges
6. `UserProfile` - 13 edges
7. `useToast()` - 12 edges
8. `logActionAndNotify()` - 12 edges
9. `What You Must Do When Invoked` - 12 edges
10. `מערכת דירוג שתיל-גזע-אלון 🌱🌳🌲` - 11 edges

## Surprising Connections (you probably didn't know these)
- `LoginPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/login/page.tsx → src/context/AuthContext.tsx
- `useLiveAuthorProfile()` --calls--> `getUserProfile()`  [EXTRACTED]
  src/components/ui/LiveAuthorDisplay.tsx → src/services/user-level.service.ts
- `UserAvatarProps` --references--> `UserProfile`  [EXTRACTED]
  src/components/ui/UserAvatar.tsx → src/types/user-levels.ts
- `AdminPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/admin/page.tsx → src/context/AuthContext.tsx
- `GET()` --calls--> `getCloudinaryUsage()`  [EXTRACTED]
  src/app/api/cloudinary/usage/route.ts → src/lib/cloudinary.ts

## Import Cycles
- None detected.

## Communities (39 total, 9 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.09
Nodes (35): AdminPage(), Conversation, ConversationsPage(), DebugPage(), ProgressRoute(), SetupProfilePage(), AdminPanel(), ForceFix() (+27 more)

### Community 1 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 2 - "recommendation.service.ts"
Cohesion: 0.09
Nodes (42): GroupedNotification, Notification, NotificationsPage(), Home(), Question, Question, QuestionPage(), SearchContent() (+34 more)

### Community 3 - "OnboardingModal.tsx"
Cohesion: 0.10
Nodes (21): DEFAULT_SETTINGS, MONTHS, SettingsPage(), UserSettings, currentYear, DAYS, MONTHS, OnboardingModal() (+13 more)

### Community 4 - "QuestionCard.tsx"
Cohesion: 0.07
Nodes (49): allPossibleTags, AskPage(), CATEGORIES, semanticClusters, Answer, AnswersModal(), AnswersModalProps, Answer (+41 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (29): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+21 more)

### Community 6 - "dependencies"
Cohesion: 0.07
Nodes (29): cloudinary, clsx, date-fns, emoji-picker-react, firebase, firebase-admin, lucide-react, multer (+21 more)

### Community 7 - "מערכת דירוג שתיל-גזע-אלון 🌱🌳🌲"
Cohesion: 0.10
Nodes (20): 🔧 אינטגרציה בקוד, 🌲 אלון (Oak), בדיקת הרשאות:, 🌳 גזע (Trunk), 📝 הערות חשובות, 🚀 התחלה מהירה, יצירת פרופיל משתמש חדש:, 📁 מבנה הקבצים (+12 more)

### Community 8 - "compilerOptions"
Cohesion: 0.08
Nodes (25): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+17 more)

### Community 9 - "[id]/page.tsx"
Cohesion: 0.10
Nodes (21): ChatPage(), Conversation, formatLastSeen(), Message, TODO: Implement report functionality - save to reports collection, ModerationPage(), Report, AudioPlayer() (+13 more)

### Community 10 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 11 - "seed-questions.mjs"
Cohesion: 0.25
Nodes (8): A, db, __dirname, envPath, main(), POLLS, QUESTIONS, ts()

### Community 12 - "cloudinary.ts"
Cohesion: 0.44
Nodes (5): POST(), GET(), deleteFromCloudinary(), getCloudinaryUsage(), listFiles()

### Community 13 - "adminDb"
Cohesion: 0.54
Nodes (5): POST(), POST(), adminAuth(), adminDb(), getAdminApp()

### Community 25 - "🚀 התחלה מהירה - מערכת דירוג שתיל-גזע-אלון"
Cohesion: 0.12
Nodes (16): 1. התחבר כמנהל ראשי, 2. נווט לדפים החדשים:, 3. הוסף את תג הרמה לממשק, 4. חבר את מערכת הניקוד לפעולות משתמשים, 5. הוסף קישורים בניווט, 🧪 בדיקה, הוספת יכולות חדשות:, 🎨 התאמה אישית (+8 more)

### Community 26 - "level-integration-examples.ts"
Cohesion: 0.28
Nodes (12): hasPermission(), updateUserStats(), canUserBanOthers(), canUserDeletePost(), canUserViewReports(), onAnswerMarkedCorrect(), onAnswerSubmitted(), onAnswerUpvoted() (+4 more)

### Community 27 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 28 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 29 - "מדריך סטיקרים ו-GIFs (Tenor מבית Google)"
Cohesion: 0.40
Nodes (4): איך מפעילים? (תהליך חד-פעמי), הגדרת המפתח באתר, למה Tenor?, מדריך סטיקרים ו-GIFs (Tenor מבית Google)

### Community 30 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 31 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 32 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 38 - "Header.tsx"
Cohesion: 0.12
Nodes (17): inter, metadata, viewport, LoginPage(), OnboardingGate(), getSearchHistory(), Header(), removeSearchHistoryItem() (+9 more)

## Knowledge Gaps
- **205 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+200 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `useAuth` to `recommendation.service.ts`, `OnboardingModal.tsx`, `QuestionCard.tsx`, `Header.tsx`, `[id]/page.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `db` connect `recommendation.service.ts` to `useAuth`, `OnboardingModal.tsx`, `QuestionCard.tsx`, `Header.tsx`, `[id]/page.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `getUserProfile()` connect `useAuth` to `[id]/page.tsx`, `level-integration-examples.ts`, `OnboardingModal.tsx`, `QuestionCard.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _205 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.08883693746347165 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `recommendation.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09084556254367575 - nodes in this community are weakly interconnected._