# 🤖 AI Code Review & Auto-Merge - Milestone 3.5

## 📖 Overview

**AI Code Review** je autonoman sistem koji automatski pregleda sve AI-generisane fixove koristeći Claude Sonnet 4.0 AI i odlučuje da li će fix biti:
- ✅ **Auto-merged** (ako ispunjava kriterijume)
- ⚠️ **Request changes** (ako ima sitnih problema)
- ❌ **Rejected** (ako je opasan ili ne rešava problem)

---

## 🔄 Workflow

```
1. AI Test Agent → Kreira PR sa fixom
2. GitHub Webhook → Obavesti našu app "PR kreiran"
3. AI Code Reviewer (Claude) → Analizira diff
4. AI Decision:
   ├─ ✅ MERGE (confidence > 80%, approved) → Auto-merge
   ├─ ⚠️ REQUEST_CHANGES (50-80% confidence) → Manual review
   └─ ❌ REJECT (< 50% confidence) → Close PR
5. Post komentar na PR sa review rezultatima
6. Sačuvaj review u database (pr_reviews tabela)
```

---

## 🧠 Što AI Code Reviewer Proverava

### 1️⃣ **Da li fix rešava originalni problem?**
- AI analizira original issue description i PR diff
- Proverava da li je tačan kod izmenjen

### 2️⃣ **Code Quality (0-100)**
- Čitljivost koda
- Poštovanje best practices
- Proper naming conventions

### 3️⃣ **Security Concerns**
- SQL injection rizici
- XSS vulnerabilities
- Authentication/Authorization problemi
- Sensitive data exposure

### 4️⃣ **Performance Impact**
- N+1 queries
- Memory leaks
- Inefficient algorithms

### 5️⃣ **Breaking Changes**
- Da li bi moglo da razbije postojeću funkcionalnost?
- Kompatibilnost sa API-jem

### 6️⃣ **Test Coverage** (ako testovi postoje)
- Da li testovi pokrivaju fix?
- Da li su testovi prošli?

---

## ⚙️ Konfiguracija (Settings)

### **Confidence Threshold** (50-100%)
Minimalni procenat confidence-a potreban da bi AI auto-merge-ovao PR.

**Preporuka:**
- 80%+ za production (default)
- 70%+ za development
- 90%+ za kritične projekte

### **Auto-Merge by Severity**

| Severity | Auto-Merge Default | Preporuka |
|----------|-------------------|-----------|
| 🟢 **LOW** | ✅ Enabled | Sigurno |
| 🟡 **MEDIUM** | ✅ Enabled | Sigurno |
| 🟠 **HIGH** | ✅ Enabled | Pročitaj review |
| 🔴 **CRITICAL** | ❌ Disabled | Manual review! |

**⚠️ Warning:** Auto-merging CRITICAL severity fixes može biti rizično. Preporučujemo manual review za kritične issue-eve.

---

## 🔧 Setup

### **1️⃣ Pokreni Supabase Migration**

```bash
# Execute in your Supabase SQL Editor
```

Kopiraj i execute `supabase_migrations_m3.5_ai_review.sql`

### **2️⃣ Setup GitHub Webhook**

1. Idi na **GitHub → Your Repo → Settings → Webhooks**
2. Click **Add webhook**
3. Payload URL: `https://your-domain.com/api/webhooks/github`
4. Content type: `application/json`
5. Secret: Generiši random string (npr: `openssl rand -hex 32`)
6. Events: Odaberi **Pull requests**
7. Active: ✅

### **3️⃣ Dodaj Webhook Secret u .env.local**

```env
GITHUB_WEBHOOK_SECRET=your_random_secret_here
```

### **4️⃣ Konfiguriši AI Review za svaki projekat**

1. Otvori projekat u AI Test Agent
2. Klikni na **Settings** dugme
3. Konfiguriši:
   - Enable AI Code Review: ✅
   - Confidence Threshold: 80%
   - Auto-merge severity levels: odaberi željene
4. **Save Settings**

---

## 📊 AI Review Output Primer

```markdown
## 🤖 AI Code Review

**Reviewer**: Claude Sonnet 4.0
**Confidence**: 92%
**Recommendation**: ✅ **MERGE**

### Summary
The fix correctly addresses the missing error boundary issue by wrapping the component with React.ErrorBoundary. Implementation follows React best practices and includes proper fallback UI.

### Code Quality: A
Score: 92/100
Best Practices: ✅ Followed

### 🔒 Security: ✅ No concerns detected

### ⚡ Performance: ✅ No concerns detected

---
**✅ Status**: Auto-merged after AI review
**Merged by**: AI Test Agent
**Reviewed by**: Claude AI
```

---

## 🗄️ Database Schema

### **ai_review_settings**
```sql
CREATE TABLE ai_review_settings (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  enabled BOOLEAN DEFAULT TRUE,
  confidence_threshold INTEGER DEFAULT 80,
  auto_merge_low BOOLEAN DEFAULT TRUE,
  auto_merge_medium BOOLEAN DEFAULT TRUE,
  auto_merge_high BOOLEAN DEFAULT TRUE,
  auto_merge_critical BOOLEAN DEFAULT FALSE,
  notify_on_merge BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### **pr_reviews**
```sql
CREATE TABLE pr_reviews (
  id UUID PRIMARY KEY,
  pr_number INTEGER,
  pr_url TEXT,
  project_id UUID REFERENCES projects(id),
  issue_id UUID REFERENCES issues(id),
  review_result JSONB, -- AIReviewResult
  action_taken VARCHAR(50), -- 'merged', 'changes_requested', 'rejected'
  merged_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## 🔐 Security

### **Webhook Signature Verification**
GitHub webhook payloads su verifikovani sa `HMAC-SHA256` signature-om da bi se sprečilo spoofing.

```typescript
function verifyGitHubSignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

### **AI-Only PR Filter**
Webhook handler obrađuje samo PR-ove koji dolaze od AI Test Agent-a (branch počinje sa `ai-fix-issue-`).

---

## 📈 Metrics & Monitoring

### **Track AI Review Performance:**
1. Confidence score histogram
2. Auto-merge rate by severity
3. False positives (merged PRs that broke things)
4. False negatives (rejected PRs that were actually good)

### **Query PR Reviews:**
```sql
SELECT 
  action_taken,
  COUNT(*) as count,
  AVG((review_result->>'confidence')::int) as avg_confidence
FROM pr_reviews
WHERE project_id = 'your-project-id'
GROUP BY action_taken;
```

---

## 🚀 Testing

### **Manual Test:**
1. Odaberi jedan issue sa HIGH severity
2. Klikni **Auto-Fix**
3. Pričekaj da se kreira PR
4. **GitHub Webhook** će automatski trigger-ovati AI review
5. Proveri:
   - ✅ Komentar na PR-u sa review rezultatima
   - ✅ PR je auto-merged ili ostao otvoren za review
   - ✅ Issue status updated na "fixed" (ako merged)
   - ✅ `pr_reviews` tabela sadrži novi entry

### **Check Logs:**
```bash
# Watch webhook logs
tail -f /var/log/ai-test-agent/webhooks.log

# Or check in your app logs for:
console.log('🤖 AI PR detected: #...')
console.log('🧠 Running AI code review...')
console.log('✅ PR #... merged successfully!')
```

---

## 🎯 Best Practices

### ✅ **DO:**
- Postavi confidence threshold na 80%+ za production
- Disable auto-merge za CRITICAL severity
- Review AI comments redovno
- Monitor false positives/negatives

### ❌ **DON'T:**
- Nemoj setovati threshold < 70% (previše risky)
- Nemoj auto-merge CRITICAL bez manual review
- Nemoj ignorisati AI warnings u komentarima

---

## 🔮 Future Improvements (Milestone 5+)

- **Slack/Email notifications** kad se PR auto-merge-uje
- **Learning from feedback**: AI uči iz manual review decisions
- **Custom rules engine**: Dodaj custom checks (e.g., "All API routes must have rate limiting")
- **Multi-reviewer consensus**: Pokretanje 2-3 AI reviews i voting
- **A/B testing**: Auto-merge 50% PRs, ostale manual review → compare metrics

---

## 🐛 Troubleshooting

### **Webhook nije trigger-ovan?**
1. Proveri webhook secret u `.env.local`
2. Proveri GitHub webhook deliveries (Settings → Webhooks → Recent Deliveries)
3. Proveri da li je branch name format `ai-fix-issue-{issueId}-{timestamp}`

### **AI review ne auto-merge-uje?**
1. Proveri confidence threshold (Settings)
2. Proveri da li je severity enabled za auto-merge
3. Proveri review recommendation (mora biti "MERGE")

### **Claude API error?**
1. Proveri `ANTHROPIC_API_KEY` u `.env.local`
2. Proveri rate limits (Claude API)
3. Proveri da li PR diff nije previše veliki (max 4000 tokens)

---

**🎉 Gotovo! AI Code Review & Auto-Merge je sada aktivan!** 🚀
