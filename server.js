import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api3-Xii...rQAA'; // Replace with your full key

/**
 * TURNITIN-CALIBRATED AI DETECTION ENGINE
 * Powered by Claude Haiku API
 * Real-time essay analysis with contextual alternative suggestions
 */
class HaikuAIDetector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-3-5-haiku-20241022';
  }

  /**
   * PRIMARY ANALYSIS FUNCTION
   * Calls Haiku API to analyze essay for AI patterns
   */
  async analyzeEssay(essay) {
    if (!essay || essay.trim().length < 50) {
      return {
        score: 0,
        confidence: 0,
        verdict: 'You\'re Good',
        flags: [],
        analysis: 'Essay too short to analyze.',
        turnitinComparison: 'Insufficient data'
      };
    }

    const systemPrompt = this.getSystemPrompt();
    const userPrompt = this.getUserPrompt(essay);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const responseText = data.content[0].text;

      // Parse JSON from Haiku response - handle multiple formats
      let result;
      try {
        // Try direct JSON parse first
        result = JSON.parse(responseText);
      } catch (e) {
        // Try extracting JSON from markdown code blocks or mixed content
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Invalid response format from Haiku - no JSON found');
        }
        const jsonStr = jsonMatch[1] || jsonMatch[2] || jsonMatch[0];
        result = JSON.parse(jsonStr);
      }

      // Validate and fix the response structure
      result = this.validateAndFixResponse(result);
      
      return result;

    } catch (error) {
      console.error('Haiku API Error:', error);
      throw error;
    }
  }

  /**
   * VALIDATE AND FIX API RESPONSE
   * Ensures response has all required fields with proper defaults
   */
  validateAndFixResponse(result) {
    // Ensure required fields exist
    const validated = {
      score: this.ensureNumber(result.score, 0, 100),
      confidence: this.ensureNumber(result.confidence, 0, 100),
      verdict: result.verdict || this.getVerdictFromScore(result.score),
      flags: Array.isArray(result.flags) ? result.flags : [],
      analysis: result.analysis || 'Analysis completed.',
      turnitinComparison: result.turnitinComparison || 'Comparison unavailable'
    };

    // Ensure verdict matches score
    validated.verdict = this.getVerdictFromScore(validated.score);

    // Validate flags structure with alternatives and explanations
    validated.flags = validated.flags.map(flag => ({
      phrase: flag.phrase || 'Unknown phrase',
      reason: flag.reason || 'Flagged for review',
      explanation: flag.explanation || flag.reason || 'This phrase is commonly associated with AI-generated text',
      alternatives: Array.isArray(flag.alternatives) ? flag.alternatives : ['revise this phrase'],
      severity: ['high', 'medium', 'low'].includes(flag.severity) ? flag.severity : 'medium'
    }));

    // Add default flags if score is high but no flags present
    if (validated.score >= 30 && validated.flags.length === 0) {
      validated.flags.push({
        phrase: 'Overall writing style',
        reason: 'Multiple AI writing patterns detected',
        explanation: 'The overall structure and word choice patterns match common AI-generated text characteristics',
        alternatives: ['Consider adding more personal voice', 'Use more conversational language', 'Add specific examples from your own experience'],
        severity: validated.score >= 70 ? 'high' : 'medium'
      });
    }

    return validated;
  }

  /**
   * HELPER: Ensure number is within range
   */
  ensureNumber(value, min, max) {
    const num = parseInt(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  /**
   * HELPER: Get verdict from score
   */
  getVerdictFromScore(score) {
    if (score >= 70) return 'Hella Sus';
    if (score >= 30) return 'Kinda Sus';
    return 'You\'re Good';
  }

  /**
   * SYSTEM PROMPT FOR HAIKU
   * Instructs Haiku on how to detect AI patterns like Turnitin
   */
  getSystemPrompt() {
    return `You are an expert AI detection system trained with the same rigor as Turnitin's AI detection algorithms. Your job is to analyze student essays and identify AI-generated content or heavy AI-editing.

CRITICAL: You must be STRICT and conservative - if something COULD be AI, flag it.

SCORING RULES:
- 0-29 "You're Good" → Clearly human-written, natural voice, minor awkward phrasing acceptable, imperfect grammar OK
- 30-69 "Kinda Sus" → Mixed signals; some AI patterns detected but not overwhelming, light AI-assist possible
- 70-100 "Hella Sus" → Strong AI indicators; likely AI-generated or heavily AI-edited

HIGHEST PRIORITY RED FLAGS (AI HALLMARKS):
1. "Unprecedented levels of" + abstract noun (ChatGPT SIGNATURE)
2. Excessive use of: multifaceted, paradigm shift, leverage (as verb), synergy, holistic, optimization
3. Perfect transitions between every idea (humans ramble, repeat ideas)
4. Uncommon word combinations: "various contexts", "wide range of", "numerous implications"
5. Overly formal corporate jargon: utilize (not use), facilitate, strategic, implement, enhance
6. Phrases like: "It is important to note that", "In conclusion, this essay has examined", "In today's world"
7. Complete absence of: contractions, questions, personal voice, hesitation, errors
8. Perfect subject-verb-object structure without deviation (>60% of sentences identical)
9. Zero paragraph flow issues - every transition is smooth and formal
10. Canonical formulas: "Furthermore, [topic]...", "Moreover, [topic]...", "Additionally, [topic]..."

HUMAN WRITING SIGNALS (GOOD):
- Contractions: don't, can't, it's, you're
- Questions and rhetorical questions
- Conversational tone: "basically", "honestly", "like", "you know"
- Grammar mistakes, run-on sentences, fragments
- Varied sentence length and structure
- Authentic imperfections and corrections
- Personal voice and opinions without hedging
- Natural paragraph transitions without formal connectors
- Idiomatic expressions and colloquialisms

TURNITIN COMPARISON:
- Score 70+: "Very likely flagged" (Turnitin would catch this)
- Score 50-69: "Possibly flagged" (borderline, needs manual review)
- Score 30-49: "Unlikely flagged" (some suspicious markers but mostly human)
- Score 0-29: "Would not flag" (passes as human)

CRITICAL REQUIREMENTS FOR FLAGS:
1. Each flag MUST include the exact phrase from the essay
2. Each flag MUST include a clear explanation of WHY it's an AI trigger
3. Each flag MUST include 2-3 contextual alternatives that fit naturally in the student's original paragraph
4. Alternatives must preserve the original meaning while sounding more human
5. Alternatives should match the student's apparent grade level and writing style

Return ONLY valid JSON with NO markdown, NO code blocks, NO explanation:

{
  "score": <0-100 integer>,
  "confidence": <0-100>,
  "verdict": "You're Good" | "Kinda Sus" | "Hella Sus",
  "flags": [
    {
      "phrase": "<exact phrase from essay>",
      "reason": "<brief label: e.g. 'AI corporate jargon'>",
      "explanation": "<1-2 sentences explaining WHY this is an AI trigger word/phrase to detectors>",
      "alternatives": [
        "<alternative 1 that fits naturally in the original context>",
        "<alternative 2 that fits naturally in the original context>",
        "<alternative 3 that fits naturally in the original context>"
      ],
      "severity": "high" | "medium" | "low"
    }
  ],
  "analysis": "<2-3 sentences on overall assessment>",
  "turnitinComparison": "<likelihood Turnitin would flag this>"
}

EXAMPLE OF GOOD FLAG:
If essay contains: "It is important to note that climate change affects various ecosystems"
{
  "phrase": "It is important to note that",
  "reason": "AI hedging phrase",
  "explanation": "This is a classic AI-generated transition phrase. AI models use this to introduce new information, but real students rarely write this formally - they just state the information directly.",
  "alternatives": [
    "Climate change affects",
    "One thing I noticed is that climate change affects",
    "What's interesting is climate change affects"
  ],
  "severity": "high"
}

IMPORTANT: 
- If score >= 30, you MUST include at least 2 specific flags with exact phrases and contextual alternatives
- If score >= 70, include at least 4-5 flags
- Always ensure alternatives make grammatical sense when substituted into the original paragraph`;
  }

  /**
   * USER PROMPT FOR HAIKU
   * Contains the actual essay to analyze
   */
  getUserPrompt(essay) {
    return `ANALYZE THIS ESSAY FOR AI PATTERNS:

---

${essay}

---

Return ONLY valid JSON (no markdown, no explanation before/after). Be STRICT - flag anything that COULD be AI.

CRITICAL REQUIREMENTS:
1. Quote exact phrases from the essay
2. Explain WHY each phrase is an AI trigger (what makes AI detectors flag it)
3. Provide 2-3 alternative words/phrases that:
   - Sound more human and natural
   - Fit grammatically in the original sentence
   - Preserve the original meaning
   - Match the student's writing level

Example: If you find "facilitate" → alternatives could be ["help", "make it easier to", "help with"]
Example: If you find "It is important to note that" → alternatives could be ["Actually,", "What's interesting is", "One thing is"]`;
  }
}

// Initialize Haiku Detector
const haikuDetector = new HaikuAIDetector(ANTHROPIC_API_KEY);

// Serve index.html at root (fallback if static file not found)
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' }, (err) => {
    if (err) {
      // If index.html doesn't exist, return API info
      res.json({ 
        status: 'ok', 
        message: 'False Flag Fixer API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          analyze: 'POST /analyze'
        }
      });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Analyze endpoint - uses HaikuAIDetector
app.post('/analyze', async (req, res) => {
  try {
    const { essay } = req.body;
    
    if (!essay || typeof essay !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request. Expected { essay: string }' 
      });
    }

    console.log(`📝 Analyzing essay (${essay.length} characters) using Haiku AI Detector`);

    // Use HaikuAIDetector for analysis
    let haikuResult;
    try {
      haikuResult = await haikuDetector.analyzeEssay(essay);
      console.log('✅ Haiku analysis complete:', {
        score: haikuResult.score,
        flagCount: haikuResult.flags?.length || 0,
        verdict: haikuResult.verdict,
        flags: haikuResult.flags
      });
    } catch (haikuError) {
      console.error('❌ Haiku detector error:', haikuError);
      // Return error response instead of crashing
      return res.status(500).json({
        error: 'AI analysis failed',
        message: haikuError.message,
        score: 50,
        issues: [],
        flagCount: 0
      });
    }

    // Validate that we got a proper response
    if (!haikuResult || typeof haikuResult.score !== 'number') {
      console.error('❌ Invalid Haiku response:', haikuResult);
      return res.status(500).json({
        error: 'Invalid AI analysis response',
        score: 50,
        issues: [],
        flagCount: 0
      });
    }

    // Transform Haiku response to frontend expected format
    // Haiku returns: { score, flags: [{ phrase, reason, explanation, alternatives, severity }], ... }
    // Frontend expects: { score, issues: [{ phrase, severity, explanation }], flagCount }
    const response = {
      score: haikuResult.score || 50,
      issues: (haikuResult.flags || []).map(flag => ({
        phrase: flag.phrase || '',
        severity: flag.severity || 'medium',
        explanation: flag.explanation || flag.reason || 'AI pattern detected',
        // Include alternatives for future use (QuickFix/Pro features)
        alternatives: flag.alternatives || []
      })),
      flagCount: haikuResult.flags?.length || 0,
      // Additional Haiku data for future use:
      confidence: haikuResult.confidence,
      verdict: haikuResult.verdict,
      turnitinComparison: haikuResult.turnitinComparison
    };
    
    // CRITICAL: If score >= 30 but no flags, log detailed warning
    if (response.score >= 30 && response.flagCount === 0) {
      console.error('❌ CRITICAL: API returned score', response.score, 'but 0 flags!');
      console.error('Haiku result:', JSON.stringify(haikuResult, null, 2));
      console.error('This violates the API prompt requirement: "If score is 30+, you MUST find and flag at least 1-3 specific phrases"');
    }

    console.log(`✅ Analysis complete: score=${response.score}, flags=${response.flagCount}, issues=${JSON.stringify(response.issues)}`);
    
    res.json(response);

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🤖 Using Haiku AI Detector (claude-3-5-haiku-20241022)`);
  console.log(`🔑 API key configured: ${ANTHROPIC_API_KEY.substring(0, 10)}...`);
});
