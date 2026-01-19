import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface CodeIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  lineNumber?: number;
  suggestedFix?: string;
}

export interface AnalysisResult {
  issues: CodeIssue[];
}

export async function analyzeCode(
  code: string, 
  filePath: string,
  language?: string
): Promise<AnalysisResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a code analysis expert. Analyze the following ${language || 'code'} file and identify all potential bugs, security vulnerabilities, performance issues, and code quality problems.

File: ${filePath}

\`\`\`${language || ''}
${code}
\`\`\`

For each issue you find, provide:
1. Severity level: CRITICAL (app crashes, security vulnerabilities, data loss), HIGH (major features broken, auth issues, payment problems), MEDIUM (minor features broken, UI glitches, missing validation), LOW (cosmetic issues, typos, edge cases), or INFO (code quality suggestions, best practices)
2. Title: Brief description of the problem
3. Description: Detailed explanation of the issue and its impact
4. Line number (if specific line can be identified)
5. Suggested fix: How to fix the problem (optional, only if clear solution exists)

Respond ONLY with a JSON object in this exact format:
{
  "issues": [
    {
      "severity": "CRITICAL",
      "title": "Example issue title",
      "description": "Detailed description of the issue",
      "lineNumber": 10,
      "suggestedFix": "Example fix code"
    }
  ]
}

If no issues are found, return: {"issues": []}

Do NOT include markdown code blocks or any other text. Return ONLY the raw JSON object.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === "text") {
      // Remove markdown code blocks if present
      let jsonText = content.text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      const result = JSON.parse(jsonText);
      return result as AnalysisResult;
    }
    
    return { issues: [] };
  } catch (error: any) {
    console.error('Error analyzing code with Claude:', error);
    throw new Error(`Code analysis failed: ${error.message}`);
  }
}

export function calculateHealthScore(issues: CodeIssue[]): number {
  let score = 100;
  
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'CRITICAL':
        score -= 15;
        break;
      case 'HIGH':
        score -= 8;
        break;
      case 'MEDIUM':
        score -= 3;
        break;
      case 'LOW':
        score -= 1;
        break;
      case 'INFO':
        score -= 0.5;
        break;
    }
  });
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

// MILESTONE 3: Auto-fix Generation

export interface FixResult {
  fixedCode: string;
  explanation: string;
  changes: string[];
}

export async function generateFix(
  originalCode: string,
  filePath: string,
  issueDescription: string,
  language?: string
): Promise<FixResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are an expert code fixer. Fix the following issue in the code:

**Issue**: ${issueDescription}

**File**: ${filePath}
**Language**: ${language || 'Auto-detect'}

**Original Code**:
\`\`\`${language || ''}
${originalCode}
\`\`\`

Please provide:
1. The complete fixed code (entire file content, not just the changed part)
2. A clear explanation of what was fixed and why
3. A list of specific changes made

**CRITICAL**: To avoid JSON parsing errors, you MUST properly escape the fixed code:
- Escape newlines as \\n
- Escape quotes as \\"
- Escape backslashes as \\\\
- Keep the entire fixedCode as a SINGLE escaped string

Respond in this EXACT format (properly escaped JSON):
{
  "fixedCode": "line1\\nline2\\nline3",
  "explanation": "explanation here",
  "changes": ["change 1", "change 2"]
}

Do NOT include markdown code blocks. Return ONLY the raw JSON object with PROPERLY ESCAPED strings.`,
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
      
      // Try to parse
      try {
        const result = JSON.parse(jsonText);
        return result as FixResult;
      } catch (parseError: any) {
        // If JSON parsing fails, try to extract and manually fix
        console.error('JSON parse error:', parseError.message);
        console.error('Problematic JSON length:', jsonText.length);
        console.error('First 500 chars:', jsonText.substring(0, 500));
        
        // Fallback: try to extract with regex and manual escaping
        const fixedCodeMatch = jsonText.match(/"fixedCode"\s*:\s*"([\s\S]*?)"\s*,\s*"explanation"/);
        const explanationMatch = jsonText.match(/"explanation"\s*:\s*"([\s\S]*?)"\s*,\s*"changes"/);
        
        if (fixedCodeMatch && explanationMatch) {
          return {
            fixedCode: originalCode, // Fallback: return original if can't parse fixed version
            explanation: explanationMatch[1],
            changes: ['Fix parsing failed - using original code'],
          };
        }
        
        throw new Error(`JSON parsing failed: ${parseError.message}. Claude may have returned improperly escaped code.`);
      }
    }
    
    throw new Error('Invalid response from Claude');
  } catch (error: any) {
    console.error('Error generating fix with Claude:', error);
    throw new Error(`Fix generation failed: ${error.message}`);
  }
}
