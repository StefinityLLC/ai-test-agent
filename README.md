# AI Test Agent

Automated code analysis and testing powered by AI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- GitHub account
- Supabase account (free tier)
- Anthropic API key (for Claude AI)

### Setup Instructions

1. **Clone and Install**

```bash
cd ai-test-agent
npm install
```

2. **Environment Setup**

Follow the detailed instructions in [SETUP.md](./SETUP.md) to configure:
- GitHub OAuth App
- Supabase database
- Anthropic API key
- NextAuth secret

3. **Run Development Server**

```bash
npm run dev
```

Open [http://localhost:3050](http://localhost:3050)

## 🎯 Milestone 1 - Completed Features

✅ GitHub OAuth authentication  
✅ Connect GitHub repositories  
✅ Dashboard with project overview  
✅ Supabase database integration  

### Testing Milestone 1

1. **Login Flow**
   - Click "Login with GitHub" button
   - Authorize the OAuth app
   - You should be redirected back to the dashboard

2. **Connect Repository**
   - Click "Connect Repository" button
   - Enter a GitHub repository URL (e.g., `https://github.com/vercel/next.js`)
   - Click "Connect Repository"
   - Project should appear in your dashboard

3. **View Projects**
   - See all connected repositories on the dashboard
   - Each project card shows:
     - Repository name
     - Owner/repo path
     - Branch name
     - Language (if detected)
     - Date added

## 🏗️ Project Structure

```
ai-test-agent/
├── app/
│   ├── page.tsx                 # Dashboard
│   ├── api/
│   │   ├── auth/               # NextAuth.js routes
│   │   ├── github/connect/     # Connect repo endpoint
│   │   └── projects/           # Get user projects
├── components/
│   ├── dashboard/
│   │   ├── project-card.tsx
│   │   └── connect-repo-dialog.tsx
│   ├── layout/
│   │   └── header.tsx
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── db.ts                   # Supabase client
│   ├── github.ts               # GitHub API wrapper
│   └── utils.ts
└── types/
    └── index.ts                # TypeScript types
```

## 📚 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: NextAuth.js
- **Database**: Supabase (PostgreSQL)
- **APIs**: 
  - GitHub API (Octokit)
  - Anthropic Claude API
- **State Management**: React Query + Zustand

## 🔜 Coming Soon

### Milestone 2: Code Analysis Engine
- Pull repository files
- Analyze code with Claude AI
- Detect issues with severity classification
- Health score calculation

### Milestone 3: Auto-Fix
- Automatic issue fixing
- PR creation on GitHub
- Test execution

### Milestone 4: Workflow Intelligence
- Git workflow analyzer
- Safety checks and backup system
- Rollback functionality

### Milestone 5: Production Ready
- i18n (Serbian/English)
- Advanced UI features
- Comprehensive error handling
- Full documentation

## 📝 License

MIT
