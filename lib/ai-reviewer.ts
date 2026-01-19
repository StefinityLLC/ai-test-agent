import Anthropic from "@anthropic-ai/sdk";
import { AIReviewResult } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface PRDiff {
  filePath: string;
  additions: number;
  deletions: number;
  changes: string;
}

/**
 * AI Code Review - Analyzes PR changes and provides comprehensive review
 */
export async function reviewPRWithAI(
  prDiff: string,
  originalIssue: {
    title: string;
    description?: string;
    severity: string;
    filePath?: string;
  },
  testResults?: {
    totalTests: number;
    passed: number;
    failed: number;
  }
): Promise<AIReviewResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are a senior code reviewer performing a thorough code review of an AI-generated fix.

**Original Issue:**
- Title: ${originalIssue.title}
- Severity: ${originalIssue.severity}
- Description: ${originalIssue.description || 'N/A'}
- File: ${originalIssue.filePath || 'N/A'}

**Code Changes (Diff):**
\`\`\`diff
${prDiff}
\`\`\`

${testResults ? `**Test Results:**
- Total Tests: ${testResults.totalTests}
- Passed: ${testResults.passed}
- Failed: ${testResults.failed}
` : ''}

**Your Task:**
Perform a comprehensive code review and analyze:

1. **Does this fix solve the original issue?** (Yes/No + explanation)
2. **Code Quality** (0-100): Is the code clean, maintainable, and following best practices?
3. **Security Concerns**: Are there any security vulnerabilities introduced?
4. **Performance Impact**: Does this change affect performance positively or negatively?
5. **Breaking Changes**: Could this break existing functionality?
6. **Test Coverage**: Are the tests sufficient? (if test results provided)
7. **Best Practices**: Does it follow language/framework best practices?

**Decision Criteria:**
- **MERGE**: Fix is correct, safe, and high quality (confidence > 80%)
- **REQUEST_CHANGES**: Fix has minor issues or concerns (confidence 50-80%)
- **REJECT**: Fix introduces bugs, security issues, or doesn't solve the problem (confidence < 50%)

Respond ONLY with a JSON object in this exact format:
{
  "approved": true/false,
  "confidence": 85,
  "recommendation": "MERGE" | "REQUEST_CHANGES" | "REJECT",
  "summary": "Brief overall assessment",
  "issues": ["Specific concern 1", "Specific concern 2"],
  "code_quality_score": 90,
  "security_concerns": ["Security issue 1"] or [],
  "performance_concerns": ["Performance issue 1"] or [],
  "best_practices_followed": true/false
}

Do NOT include markdown code blocks or any other text. Return ONLY the raw JSON object.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text") {
      let jsonText = content.text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      const result = JSON.parse(jsonText) as AIReviewResult;
      
      // Validate and ensure all required fields exist
      return {
        approved: result.approved || false,
        confidence: Math.max(0, Math.min(100, result.confidence || 0)),
        recommendation: result.recommendation || 'REJECT',
        summary: result.summary || 'No summary provided',
        issues: result.issues || [],
        code_quality_score: Math.max(0, Math.min(100, result.code_quality_score || 0)),
        security_concerns: result.security_concerns || [],
        performance_concerns: result.performance_concerns || [],
        best_practices_followed: result.best_practices_followed || false,
      };
    }
    
    throw new Error('Invalid response from Claude AI Reviewer');
  } catch (error: any) {
    console.error('Error performing AI code review:', error);
    throw new Error(`AI code review failed: ${error.message}`);
  }
}

/**
 * Formats AI review result as a GitHub PR comment
 */
export function formatReviewComment(review: AIReviewResult): string {
  const { approved, confidence, recommendation, summary, issues, code_quality_score, security_concerns, performance_concerns, best_practices_followed } = review;
  
  let emoji = '✅';
  if (recommendation === 'REQUEST_CHANGES') emoji = '⚠️';
  if (recommendation === 'REJECT') emoji = '❌';
  
  let comment = `## 🤖 AI Code Review\n\n`;
  comment += `**Reviewer**: Claude Sonnet 4.0\n`;
  comment += `**Confidence**: ${confidence}%\n`;
  comment += `**Recommendation**: ${emoji} **${recommendation}**\n\n`;
  comment += `### Summary\n${summary}\n\n`;
  
  comment += `### Code Quality: ${getGrade(code_quality_score)}\n`;
  comment += `Score: ${code_quality_score}/100\n`;
  comment += `Best Practices: ${best_practices_followed ? '✅ Followed' : '⚠️ Needs improvement'}\n\n`;
  
  if (security_concerns.length > 0) {
    comment += `### 🔒 Security Concerns\n`;
    security_concerns.forEach(concern => comment += `- ⚠️ ${concern}\n`);
    comment += `\n`;
  } else {
    comment += `### 🔒 Security: ✅ No concerns detected\n\n`;
  }
  
  if (performance_concerns.length > 0) {
    comment += `### ⚡ Performance Concerns\n`;
    performance_concerns.forEach(concern => comment += `- ⚠️ ${concern}\n`);
    comment += `\n`;
  } else {
    comment += `### ⚡ Performance: ✅ No concerns detected\n\n`;
  }
  
  if (issues.length > 0) {
    comment += `### ⚠️ Issues Found\n`;
    issues.forEach((issue, index) => comment += `${index + 1}. ${issue}\n`);
    comment += `\n`;
  }
  
  if (approved && recommendation === 'MERGE') {
    comment += `---\n**✅ Status**: Auto-merged after AI review\n`;
    comment += `**Merged by**: AI Test Agent\n`;
    comment += `**Reviewed by**: Claude AI\n`;
  } else if (recommendation === 'REQUEST_CHANGES') {
    comment += `---\n**⚠️ Status**: Changes requested - Please review the concerns above\n`;
  } else {
    comment += `---\n**❌ Status**: Rejected - Fix needs significant improvements\n`;
  }
  
  return comment;
}

/**
 * Helper: Convert score to letter grade
 */
function getGrade(score: number): string {
  if (score >= 95) return 'A+ 🌟';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  return 'D';
}
