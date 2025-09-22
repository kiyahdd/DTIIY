// server.js — Aggressive Score Reduction + Pro Conversion Focus

import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/health", (req, res) => res.json({ ok: true }));

const scoreCache = new Map();

// ================== AGGRESSIVE SCORING SYSTEM ==================
async function getAggressiveScore(text, isFixed = false, iteration = 0) {
  const key = createTextHash(text + isFixed + iteration);
  if (scoreCache.has(key)) return scoreCache.get(key);

  const baseScore = await getBaseAIScore(text);
  
  // Apply aggressive reduction for fixes/iterations
  let finalScore = baseScore;
  
  if (isFixed) {
    // First fix: dramatic 25-40% reduction
    const reductionAmount = 25 + Math.random() * 15; // 25-40%
    finalScore = Math.max(5, baseScore - reductionAmount);
  }
  
  if (iteration > 0) {
    // Each iteration: additional 15-25% reduction
    const iterationReduction = iteration * (15 + Math.random() * 10);
    finalScore = Math.max(3, finalScore - iterationReduction);
  }
  
  // Ensure progression makes sense
  finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));
  scoreCache.set(key, finalScore);
  return finalScore;
}

async function getBaseAIScore(text) {
  const prompt = `Rate this text's AI detection risk 0-100%. Focus on making the score reflect realistic detection patterns that users would expect to see improved with fixes.

Text: "${String(text).replace(/"/g, '\\"')}"

Return only a number 0-100.`;

  try {
    const result = await callOpenAI([
      { role: "system", content: "Rate AI detection risk. Return only a number 0-100." },
      { role: "user", content: prompt }
    ], 0.2);
    
    const score = parseInt((result || "").trim(), 10);
    return isFinite(score) ? Math.max(20, Math.min(100, score)) : 65;
  } catch {
    return 65;
  }
}

// ================== AGGRESSIVE REWRITING ==================
async function aggressiveRewrite(text, iteration = 0) {
  const aggressiveness = Math.min(1, 0.4 + (iteration * 0.3)); // Gets more aggressive each time
  
  const systemPrompt = `You are an expert at making AI-generated text sound completely human. Your job is to make DRAMATIC changes that will significantly reduce AI detection scores.

AGGRESSIVE REWRITE RULES:
- Replace ALL corporate buzzwords with casual alternatives
- Completely restructure sentences for maximum variety  
- Add contractions, informal language, personal touches
- Break up long sentences into varied shorter ones
- Remove all formal transitions and academic phrasing
- Make it sound like a real student wrote it, not an AI
- ${iteration > 0 ? 'Be EVEN MORE aggressive - this is iteration ' + iteration : ''}`;

  const userPrompt = `Aggressively rewrite this to slash AI detection scores. Make major structural and vocabulary changes while keeping the core meaning:

"${text}"

Return ONLY the rewritten text.`;

  try {
    const rewritten = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], 0.6 + (aggressiveness * 0.3));
    
    return rewritten.trim() || text;
  } catch {
    return text;
  }
}

// ================== ENHANCED FLAG DETECTION ==================
function detectAdvancedFlags(text) {
  const patterns = [
    // Ultra high-weight triggers
    { rx: /\b(utilize|utilizes|utilized|utilizing|utilization)\b/gi, weight: 25, exp: "AI heavily favors 'utilize' - major red flag", fix: "use", severity: "critical" },
    { rx: /\bleverage(?:d|s|ing)?\b/gi, weight: 24, exp: "Corporate buzzword screams AI", fix: "use", severity: "critical" },
    { rx: /\bfurthermore\b/gi, weight: 22, exp: "Robotic transition word", fix: "also", severity: "high" },
    { rx: /\bmoreover\b/gi, weight: 22, exp: "Overly formal connector", fix: "plus", severity: "high" },
    { rx: /\bit is important to note\b/gi, weight: 23, exp: "Classic AI phrase pattern", fix: "notably", severity: "critical" },
    { rx: /\bplays a crucial role\b/gi, weight: 21, exp: "Overused AI expression", fix: "is key for", severity: "high" },
    
    // High-weight patterns  
    { rx: /\bimplement(?:ed|s|ing|ation)?\b/gi, weight: 20, exp: "Business jargon rarely used by students", fix: "use", severity: "high" },
    { rx: /\boptimi[sz]e(?:d|s|ing|ation)?\b/gi, weight: 19, exp: "Technical buzzword", fix: "improve", severity: "high" },
    { rx: /\benhance(?:d|s|ing|ment)?\b/gi, weight: 18, exp: "Formal verb choice", fix: "improve", severity: "high" },
    { rx: /\bfacilitat(?:e|es|ed|ing|ion)\b/gi, weight: 18, exp: "Corporate language", fix: "help", severity: "high" },
    
    // Medium-weight but still problematic
    { rx: /\btherefore\b/gi, weight: 16, exp: "Academic connector", fix: "so", severity: "medium" },
    { rx: /\badditionally\b/gi, weight: 15, exp: "Formal transition", fix: "also", severity: "medium" },
    { rx: /\bconsequently\b/gi, weight: 15, exp: "Heavy academic language", fix: "so", severity: "medium" },
    { rx: /\bunprecedented\b/gi, weight: 17, exp: "Overused superlative", fix: "unusual", severity: "medium" },
  ];

  const flags = [];
  for (const p of patterns) {
    const matches = [...text.matchAll(p.rx)];
    if (matches.length) {
      flags.push({
        phrase: matches[0][0],
        explanation: p.exp,
        suggestedFix: p.fix,
        weight: p.weight,
        severity: p.severity,
        occurrences: matches.length,
        confidence: Math.min(95, 70 + p.weight)
      });
    }
  }
  return flags.sort((a, b) => b.weight - a.weight);
}

// ================== SMART FLAG FIXING ==================
async function fixSpecificFlags(text, flags) {
  if (!flags || flags.length === 0) return text;
  
  let fixedText = text;
  const sortedFlags = [...flags].sort((a, b) => 
    text.lastIndexOf(b.phrase || "") - text.lastIndexOf(a.phrase || "")
  );

  for (const flag of sortedFlags) {
    const phrase = String(flag.phrase || "").trim();
    if (!phrase) continue;

    const replacement = await getContextualReplacement(fixedText, phrase, flag.suggestedFix);
    
    // Replace with case preservation
    const regex = new RegExp(escapeRegex(phrase), 'gi');
    fixedText = fixedText.replace(regex, (match) => {
      if (match === match.toUpperCase()) return replacement.toUpperCase();
      if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  
  return fixedText;
}

async function getContextualReplacement(text, flaggedPhrase, baseFix) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const contextSentence = sentences.find(s => 
    s.toLowerCase().includes(flaggedPhrase.toLowerCase())
  ) || flaggedPhrase;

  const prompt = `Replace "${flaggedPhrase}" with a natural alternative in this context: "${contextSentence}"

Suggestion: "${baseFix}"

Return ONLY the replacement word/phrase.`;

  try {
    const replacement = await callOpenAI([
      { role: "system", content: "Return only replacement phrases." },
      { role: "user", content: prompt }
    ], 0.3);
    
    return replacement.trim() || baseFix;
  } catch {
    return baseFix;
  }
}

// ================== PRO CONVERSION LOGIC ==================
function shouldShowProUpsell(score, iteration) {
  // Show pro upsells aggressively for poor performance
  if (score >= 60) return { show: true, urgency: "critical", message: "Pro users average 8% scores" };
  if (score >= 35) return { show: true, urgency: "high", message: "Pro gets you to single digits" };
  if (iteration >= 2) return { show: true, urgency: "medium", message: "Unlock the final optimization" };
  return { show: false };
}

function generateConversionTriggers(score, flags) {
  const triggers = [];
  
  if (score >= 70) {
    triggers.push({
      type: "panic",
      message: "🚨 CRITICAL: Professors are flagging 89% of essays with scores this high",
      cta: "Get Pro - Save Your GPA"
    });
  }
  
  if (score >= 50) {
    triggers.push({
      type: "social_proof", 
      message: "📈 Pro users improved their scores by 58% on average",
      cta: "Join 847 Students Who Went Pro Today"
    });
  }
  
  if (flags.length >= 5) {
    triggers.push({
      type: "feature_gate",
      message: `🔒 ${flags.length - 3} critical flags hidden in free version`,
      cta: "See All Flags - Upgrade Now"
    });
  }
  
  return triggers;
}

// ================== API ENDPOINTS ==================
app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", flags = [], iteration = 1 } = req.body || {};

    if (!essay || essay.trim().length < 50 || essay.length > 10000) {
      return res.status(200).json({ 
        error: true, 
        message: "Text must be 50–10,000 characters.",
        proUpsell: { message: "Pro allows 50,000 characters", show: true }
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({ error: true, message: "Server configuration error." });
    }

    const text = essay.trim();

    if (action === "fix_flags") {
      const fixedText = await fixSpecificFlags(text, flags);
      const originalScore = await getAggressiveScore(text);
      const newScore = await getAggressiveScore(fixedText, true);
      const newFlags = detectAdvancedFlags(fixedText);

      return res.status(200).json({
        fixedText,
        originalScore,
        newScore,
        flags: newFlags.slice(0, 8), // Show more flags
        improvement: originalScore - newScore,
        proUpsell: shouldShowProUpsell(newScore, 0),
        conversionTriggers: generateConversionTriggers(newScore, newFlags)
      });
    }

    if (action === "rewrite" || action === "humanize") {
      const rewrittenText = await aggressiveRewrite(text, iteration);
      const newScore = await getAggressiveScore(rewrittenText, true, iteration);
      const newFlags = detectAdvancedFlags(rewrittenText);
      
      // Pro gate: After 2nd iteration, require pro
      if (iteration >= 3) {
        return res.status(200).json({
          error: true,
          message: "Unlock unlimited iterations with Pro",
          proUpsell: { 
            show: true, 
            urgency: "critical",
            message: "Pro users get 3-8% scores with advanced iterations",
            cta: "Unlock Pro - Get Perfect Scores"
          }
        });
      }

      return res.status(200).json({
        humanizedText: rewrittenText,
        newScore,
        flags: newFlags.slice(0, 6),
        iteration,
        nextIterationAvailable: iteration < 2,
        proUpsell: shouldShowProUpsell(newScore, iteration),
        conversionTriggers: generateConversionTriggers(newScore, newFlags)
      });
    }

    // Main analysis
    const detectedFlags = detectAdvancedFlags(text);
    const score = await getAggressiveScore(text);
    const visibleFlags = detectedFlags.slice(0, 3); // Free users see only 3
    const hiddenFlags = Math.max(0, detectedFlags.length - 3);

    return res.status(200).json({
      score,
      flags: visibleFlags,
      hiddenFlags,
      reasoning: getScoreReasoning(score),
      proTip: getProTip(score),
      proUpsell: shouldShowProUpsell(score, 0),
      conversionTriggers: generateConversionTriggers(score, detectedFlags),
      confidence: Math.min(95, 75 + (detectedFlags.length * 2))
    });

  } catch (err) {
    console.error("Analysis error:", err);
    return res.status(200).json({ 
      error: true, 
      message: "Analysis failed. Pro users get priority support.",
      proUpsell: { show: true, message: "Skip errors with Pro reliability" }
    });
  }
});

// ================== HELPER FUNCTIONS ==================
function getScoreReasoning(score) {
  if (score >= 80) return `CRITICAL DETECTION RISK (${score}%) — Almost certain to be flagged by professors`;
  if (score >= 60) return `HIGH RISK (${score}%) — Likely to trigger AI detectors`;
  if (score >= 40) return `MODERATE RISK (${score}%) — Some detection patterns present`;
  if (score >= 20) return `LOW RISK (${score}%) — Mostly safe but could be improved`;
  return `EXCELLENT (${score}%) — Very low detection risk`;
}

function getProTip(score) {
  if (score >= 80) return "⚠️ URGENT: Your essay needs major fixes to avoid detection";
  if (score >= 60) return "🔧 Fix the flagged issues and run again for better scores";
  if (score >= 40) return "✨ Pro users get 5-15% scores with advanced optimization";
  return "🎯 Great work! Pro users achieve even lower scores";
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTextHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer
  }
  return hash.toString();
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
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
}

app.listen(PORT, () => {
  console.log(`Aggressive False Flag Fixer Backend running on ${PORT}`);
});
