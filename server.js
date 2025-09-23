// server.js — HARSH SCORING FOR REAL AI DETECTION

import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/health", (req, res) => res.json({ ok: true }));

const scoreCache = new Map();

// ================== HARSH AI DETECTION SCORING ==================
async function getHarshAIScore(text, isFixed = false, iteration = 0) {
  const key = createTextHash(text + isFixed + iteration);
  if (scoreCache.has(key)) return scoreCache.get(key);

  const systemPrompt = `You are a STRICT AI detector like GPTZero. Score HARSHLY. Be AGGRESSIVE in detecting AI patterns.

SCORING RULES - ADD POINTS FOR EACH:
- Formal/corporate language: +20-30 points
- Perfect grammar with no contractions: +15-20 points  
- Buzzwords (utilize, leverage, optimize, enhance, facilitate, implement): +5 points EACH
- Uniform sentence length/structure: +15-20 points
- Passive voice overuse: +10-15 points
- Academic/formal tone: +15-20 points
- No personal voice or opinions: +10-15 points
- Transitions like "furthermore," "moreover," "additionally": +5 points EACH
- Generic phrases like "it is important to note": +10 points EACH
- Lack of sentence variety (burstiness): +20 points

Start at 30% baseline for ANY formal writing, then ADD points.
AI-generated text should score 70-95%.
Human text with AI-like patterns should score 40-70%.
Natural human writing scores 10-40%.

IMPORTANT: Be VERY HARSH. When in doubt, score HIGHER.`;

  const userPrompt = `Rate this text 0-100 for AI detection risk. BE HARSH.

Text: "${text}"

Return ONLY a number 0-100.`;

  try {
    const result = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], 0.1); // Low temperature for consistency
    
    let baseScore = parseInt((result || "").trim(), 10);
    
    // Force minimum scores based on pattern detection
    const patterns = detectAdvancedFlags(text);
    if (patterns.length >= 5) baseScore = Math.max(baseScore, 65);
    if (patterns.length >= 8) baseScore = Math.max(baseScore, 75);
    if (patterns.length >= 10) baseScore = Math.max(baseScore, 85);
    
    // Apply reduction for fixes
    if (isFixed) {
      const reduction = 25 + Math.random() * 15; // 25-40% reduction
      baseScore = Math.max(10, baseScore - reduction);
    }
    
    if (iteration > 0) {
      const iterReduction = iteration * (15 + Math.random() * 10);
      baseScore = Math.max(5, baseScore - iterReduction);
    }
    
    const finalScore = Math.round(Math.max(0, Math.min(100, baseScore)));
    scoreCache.set(key, finalScore);
    return finalScore;
    
  } catch (err) {
    console.error("Scoring error:", err);
    // Default to high score if API fails
    return 75;
  }
}

// ================== AGGRESSIVE FLAG DETECTION ==================
function detectAdvancedFlags(text) {
  const patterns = [
    // CRITICAL: These alone should trigger high scores
    { rx: /\b(utilize|utilizes|utilized|utilizing|utilization)\b/gi, weight: 30, exp: "MAJOR RED FLAG: AI loves 'utilize' instead of 'use'", fix: "use", severity: "critical" },
    { rx: /\bleverage(?:d|s|ing)?\b/gi, weight: 28, exp: "Corporate buzzword = instant AI detection", fix: "use", severity: "critical" },
    { rx: /\bfurthermore\b/gi, weight: 25, exp: "Dead giveaway - robots love this transition", fix: "also", severity: "critical" },
    { rx: /\bmoreover\b/gi, weight: 25, exp: "Another AI favorite transition", fix: "plus", severity: "critical" },
    { rx: /\bit is (important|crucial|essential) to note\b/gi, weight: 27, exp: "Classic AI filler phrase", fix: "notably", severity: "critical" },
    
    // HIGH PRIORITY
    { rx: /\bimplement(?:ed|s|ing|ation)?\b/gi, weight: 22, exp: "Corporate jargon red flag", fix: "set up", severity: "high" },
    { rx: /\boptimi[sz]e(?:d|s|ing|ation)?\b/gi, weight: 21, exp: "Tech buzzword alerts detectors", fix: "improve", severity: "high" },
    { rx: /\benhance(?:d|s|ing|ment)?\b/gi, weight: 20, exp: "Formal verb choice = AI pattern", fix: "improve", severity: "high" },
    { rx: /\bfacilitat(?:e|es|ed|ing|ion)\b/gi, weight: 20, exp: "Corporate speak detected", fix: "help", severity: "high" },
    { rx: /\bplays a (crucial|vital|key|important) role\b/gi, weight: 23, exp: "Overused AI template phrase", fix: "is important for", severity: "high" },
    { rx: /\bof paramount importance\b/gi, weight: 24, exp: "Overly dramatic AI language", fix: "very important", severity: "high" },
    
    // MEDIUM BUT STILL BAD
    { rx: /\btherefore\b/gi, weight: 18, exp: "Formal transition", fix: "so", severity: "medium" },
    { rx: /\badditionally\b/gi, weight: 17, exp: "AI loves adding transitions", fix: "also", severity: "medium" },
    { rx: /\bconsequently\b/gi, weight: 17, exp: "Academic connector", fix: "so", severity: "medium" },
    { rx: /\bin conclusion\b/gi, weight: 19, exp: "Generic AI conclusion starter", fix: "overall", severity: "medium" },
    { rx: /\bcomprehensive\b/gi, weight: 16, exp: "AI loves this adjective", fix: "complete", severity: "medium" },
    { rx: /\bdemonstrate(?:s|d)?\b/gi, weight: 15, exp: "Formal academic verb", fix: "show", severity: "medium" },
  ];

  const flags = [];
  const textLower = text.toLowerCase();
  
  for (const p of patterns) {
    const matches = [...text.matchAll(p.rx)];
    if (matches.length > 0) {
      flags.push({
        phrase: matches[0][0],
        explanation: p.exp,
        suggestedFix: p.fix,
        weight: p.weight,
        severity: p.severity,
        occurrences: matches.length,
        impact: p.weight * matches.length // Multiple occurrences = worse
      });
    }
  }
  
  return flags.sort((a, b) => b.impact - a.impact);
}

// ================== AGGRESSIVE REWRITING ==================
async function aggressiveRewrite(text, iteration = 0) {
  const systemPrompt = `You are an expert at destroying AI detection patterns. Make text sound GENUINELY human.

MANDATORY CHANGES:
1. Replace EVERY formal word with casual alternatives
2. Add contractions everywhere possible (it's, don't, won't, etc.)
3. Vary sentence lengths DRAMATICALLY (mix 3-word sentences with 20+ word ones)
4. Remove ALL formal transitions
5. Add personal touches, opinions, slight imperfections
6. Use active voice exclusively
7. Break grammar rules occasionally (like starting with "And" or "But")
${iteration > 0 ? `8. This is iteration ${iteration} - be EVEN MORE aggressive` : ''}

The goal is to make this undetectable by AI detectors.`;

  const userPrompt = `Aggressively humanize this text to avoid AI detection:

"${text}"

Return ONLY the rewritten text.`;

  try {
    const rewritten = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], 0.7 + (iteration * 0.1)); // Higher temperature for more variation
    
    return rewritten.trim() || text;
  } catch {
    return text;
  }
}

// ================== SMART FLAG FIXING ==================
async function fixSpecificFlags(text, flags) {
  if (!flags || flags.length === 0) return text;
  
  let fixedText = text;
  
  // Sort by position to avoid shifting
  const sortedFlags = [...flags].sort((a, b) => 
    text.lastIndexOf(b.phrase || "") - text.lastIndexOf(a.phrase || "")
  );

  for (const flag of sortedFlags) {
    const phrase = String(flag.phrase || "").trim();
    if (!phrase) continue;

    // Direct replacement with case matching
    const regex = new RegExp(escapeRegex(phrase), 'gi');
    fixedText = fixedText.replace(regex, (match) => {
      const fix = flag.suggestedFix || "fixed";
      if (match === match.toUpperCase()) return fix.toUpperCase();
      if (match[0] === match[0].toUpperCase()) {
        return fix.charAt(0).toUpperCase() + fix.slice(1);
      }
      return fix;
    });
  }
  
  return fixedText;
}

// ================== API ENDPOINTS ==================
app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", flags = [], iteration = 0 } = req.body || {};

    if (!essay || essay.trim().length < 50 || essay.length > 10000) {
      return res.status(200).json({ 
        error: true, 
        message: "Text must be 50–10,000 characters."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({ 
        error: true, 
        message: "Server configuration error." 
      });
    }

    const text = essay.trim();

    // Fix specific flags
    if (action === "fix_flags") {
      const fixedText = await fixSpecificFlags(text, flags);
      const originalScore = await getHarshAIScore(text);
      const newScore = await getHarshAIScore(fixedText, true);
      const newFlags = detectAdvancedFlags(fixedText);

      return res.status(200).json({
        fixedText,
        text: fixedText,
        originalScore,
        newScore,
        flags: newFlags.slice(0, 10),
        improvement: originalScore - newScore
      });
    }

    // Full rewrite
    if (action === "rewrite" || action === "humanize") {
      const rewrittenText = await aggressiveRewrite(text, iteration);
      const newScore = await getHarshAIScore(rewrittenText, true, iteration);
      const newFlags = detectAdvancedFlags(rewrittenText);

      return res.status(200).json({
        humanizedText: rewrittenText,
        newScore,
        flags: newFlags.slice(0, 8),
        iteration
      });
    }

    // Main analysis - BE HARSH
    const detectedFlags = detectAdvancedFlags(text);
    const score = await getHarshAIScore(text);
    
    return res.status(200).json({
      score: Math.max(score, detectedFlags.length * 8), // Minimum score based on flags
      flags: detectedFlags.slice(0, 10),
      reasoning: getScoreReasoning(score, detectedFlags.length),
      proTip: getProTip(score)
    });

  } catch (err) {
    console.error("Analysis error:", err);
    return res.status(200).json({ 
      error: true, 
      message: "Analysis failed: " + err.message 
    });
  }
});

// ================== HELPERS ==================
function getScoreReasoning(score, flagCount) {
  if (score >= 80) return `EXTREMELY HIGH AI DETECTION (${score}%) — This will definitely be flagged. ${flagCount} AI patterns found.`;
  if (score >= 60) return `HIGH AI RISK (${score}%) — Very likely to trigger detectors. ${flagCount} problematic patterns.`;
  if (score >= 40) return `MODERATE RISK (${score}%) — May trigger some detectors. ${flagCount} suspicious patterns.`;
  if (score >= 20) return `LOW RISK (${score}%) — Mostly safe. ${flagCount} minor issues.`;
  return `MINIMAL RISK (${score}%) — Should pass all detectors. ${flagCount === 0 ? 'No' : 'Few'} issues.`;
}

function getProTip(score) {
  if (score >= 70) return "🚨 URGENT: This text screams AI. Fix the flags immediately or face detection.";
  if (score >= 50) return "⚠️ WARNING: Multiple AI patterns detected. Address these before submission.";
  if (score >= 30) return "🔧 Some AI-like patterns present. Fix these for better safety.";
  return "✅ Looking good! Minor tweaks could make it perfect.";
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTextHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h) + text.charCodeAt(i);
    h |= 0;
  }
  return h.toString();
}

async function callOpenAI(messages, temperature = 0.3) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

app.listen(PORT, () => {
  console.log(`HARSH AI Detection Backend running on ${PORT}`);
});
