// server.js — Enhanced Multi-Model AI Detection Predictor

import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/health", (req, res) => res.json({ ok: true }));

// Optional calibration
const CAL_SLOPE = Number(process.env.SUS_CAL_SLOPE || 1.0);
const CAL_OFFSET = Number(process.env.SUS_CAL_OFFSET || 0);

const scoreCache = new Map();
const patternCache = new Map();

// ================== MULTI-MODEL ENSEMBLE SCORING ==================
async function getEnsembleAIScore(text) {
  const key = createTextHash(text);
  if (scoreCache.has(key)) return scoreCache.get(key);

  // Run multiple analysis approaches in parallel
  const [gptZeroScore, turnitinScore, generalScore, patternScore] = await Promise.all([
    getGPTZeroStyleScore(text),
    getTurnitinStyleScore(text),
    getGeneralDetectorScore(text),
    getLinguisticPatternScore(text)
  ]);

  // Weighted ensemble (you can adjust these weights based on testing)
  const ensembleScore = Math.round(
    (gptZeroScore * 0.3) + 
    (turnitinScore * 0.25) + 
    (generalScore * 0.25) + 
    (patternScore * 0.2)
  );

  scoreCache.set(key, ensembleScore);
  return ensembleScore;
}

async function getGPTZeroStyleScore(text) {
  const prompt = `You are GPTZero's detection algorithm. Analyze this text using GPTZero's specific criteria:

FOCUS ON:
- Perplexity: How predictable is each word choice? 
- Burstiness: Variation in sentence complexity and length
- Human inconsistencies vs AI uniformity
- Natural vocabulary choices vs AI-preferred terms

RATE 0-100 based on likelihood GPTZero would flag this:
- 0-20: GPTZero would likely pass this (high perplexity, high burstiness)
- 21-40: Low detection risk 
- 41-60: Moderate risk (some uniform patterns)
- 61-80: High risk (low perplexity, predictable patterns)
- 81-100: GPTZero would almost certainly flag this

Text: "${String(text).replace(/"/g, '\\"')}"

Return only a number 0-100.`;

  return await callOpenAI([
    { role: "system", content: "You are GPTZero's detection algorithm. Respond only with a number 0-100." },
    { role: "user", content: prompt }
  ], 0.1);
}

async function getTurnitinStyleScore(text) {
  const prompt = `You are Turnitin's AI detection system. Analyze using Turnitin's approach:

TURNITIN FOCUSES ON:
- Academic writing patterns vs natural expression
- Formal language density
- Citation and reference patterns
- Paragraph structure uniformity
- "Essay-like" vs conversational tone

Rate 0-100 for Turnitin detection risk:
- 0-20: Natural, conversational academic writing
- 21-40: Some formal patterns but likely human
- 41-60: Mixed signals - could trigger review
- 61-80: Strong academic AI patterns
- 81-100: Classic AI academic writing

Text: "${String(text).replace(/"/g, '\\"')}"

Return only a number 0-100.`;

  return await callOpenAI([
    { role: "system", content: "You are Turnitin's AI detection algorithm. Respond only with a number 0-100." },
    { role: "user", content: prompt }
  ], 0.1);
}

async function getGeneralDetectorScore(text) {
  const prompt = `You represent the consensus of multiple AI detectors (Writer.com, Originality.ai, ZeroGPT, etc.). 

COMMON DETECTION TRIGGERS:
- Repetitive sentence structures
- Overuse of transition words
- Generic, non-specific language
- Perfect grammar with no natural errors
- Lack of personal voice or opinion
- Corporate/business language in academic contexts

Rate 0-100 for general AI detector consensus:
Text: "${String(text).replace(/"/g, '\\"')}"

Return only a number 0-100.`;

  return await callOpenAI([
    { role: "system", content: "You represent AI detector consensus. Respond only with a number 0-100." },
    { role: "user", content: prompt }
  ], 0.1);
}

// Linguistic pattern analysis based on empirical research
async function getLinguisticPatternScore(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.match(/\b\w+\b/g) || [];
  
  let score = 0;
  
  // Sentence length variance (low variance = more AI-like)
  const sentLengths = sentences.map(s => (s.match(/\b\w+\b/g) || []).length);
  const avgLength = sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length;
  const variance = sentLengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / sentLengths.length;
  const stdDev = Math.sqrt(variance);
  
  // Low variance increases AI likelihood
  if (stdDev < 3) score += 25;
  else if (stdDev < 5) score += 15;
  else if (stdDev < 7) score += 5;
  
  // Average sentence length (very long or very uniform = AI-like)
  if (avgLength > 25) score += 20;
  else if (avgLength > 20) score += 10;
  
  // Transition word density
  const transitions = text.match(/\b(furthermore|moreover|therefore|thus|hence|additionally|consequently|in conclusion|to summarize|in summary)\b/gi) || [];
  const transitionDensity = transitions.length / sentences.length;
  if (transitionDensity > 0.3) score += 20;
  else if (transitionDensity > 0.2) score += 10;
  
  // Corporate buzzword density
  const buzzwords = text.match(/\b(utilize|leverage|implement|optimize|enhance|facilitate|streamline|maximize|unprecedented|cutting-edge)\b/gi) || [];
  const buzzwordDensity = buzzwords.length / words.length;
  if (buzzwordDensity > 0.02) score += 25;
  else if (buzzwordDensity > 0.01) score += 15;
  
  return Math.min(100, score);
}

// Enhanced pattern detection with empirical data
function detectAdvancedAIPatterns(text) {
  const patterns = [
    // High-weight empirically proven triggers
    { rx: /\b(this essay will|this paper will|this report will)\b/gi, weight: 25, exp: "Meta-commentary about the writing itself - major AI tell", fix: "Remove meta-commentary" },
    { rx: /\bin conclusion,?\s*(it is clear|we can see|it is evident)\b/gi, weight: 22, exp: "Classic AI conclusion pattern", fix: "Use natural conclusion" },
    { rx: /\butili[sz]e(?:d|s|ing|ation)?\b/gi, weight: 20, exp: "AI strongly prefers 'utilize' over 'use'", fix: "use" },
    { rx: /\bleverage(?:d|s|ing)?\b/gi, weight: 20, exp: "Corporate buzzword rarely used by students", fix: "use" },
    { rx: /\bit is important to note that\b/gi, weight: 18, exp: "Formulaic academic phrase", fix: "notably" },
    { rx: /\bplays a crucial role\b/gi, weight: 18, exp: "Overused AI phrase", fix: "is important for" },
    
    // Medium-weight patterns
    { rx: /\bfurthermore\b/gi, weight: 15, exp: "Formal transition overused by AI", fix: "also" },
    { rx: /\bmoreover\b/gi, weight: 15, exp: "Formal transition overused by AI", fix: "plus" },
    { rx: /\bimplement(?:ed|s|ing|ation)?\b/gi, weight: 14, exp: "Business jargon in academic context", fix: "use" },
    { rx: /\boptimi[sz]e(?:d|s|ing|ation)?\b/gi, weight: 14, exp: "Technical buzzword", fix: "improve" },
    { rx: /\bsignificant impact\b/gi, weight: 12, exp: "Generic academic phrasing", fix: "major effect" },
    { rx: /\bcomprehensive approach\b/gi, weight: 12, exp: "Buzzword combination", fix: "complete method" },
    
    // Sentence structure patterns
    { rx: /\b(therefore|thus|hence),?\s+it\b/gi, weight: 11, exp: "Robotic logical connector", fix: "so" },
    { rx: /\badditionally,?\s+it\b/gi, weight: 10, exp: "Mechanical addition pattern", fix: "also" },
    
    // Academic clichés
    { rx: /\bof paramount importance\b/gi, weight: 16, exp: "Exaggerated formal language", fix: "very important" },
    { rx: /\bunprecedented\b/gi, weight: 13, exp: "Overused superlative", fix: "unusual" },
    { rx: /\bcutting[- ]edge\b/gi, weight: 12, exp: "Marketing language", fix: "new" }
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
        severity: p.weight >= 18 ? "high" : p.weight >= 12 ? "medium" : "low",
        occurrences: matches.length,
        confidence: Math.min(95, 60 + p.weight) // confidence percentage
      });
    }
  }
  return flags.sort((a, b) => b.weight - a.weight);
}

// Enhanced fallback with multiple prompting strategies
async function detectWithAdvancedFallback(text) {
  const regexFlags = detectAdvancedAIPatterns(text);
  if (regexFlags.length >= 3) return regexFlags;

  try {
    // Try multiple prompting approaches
    const [approach1, approach2] = await Promise.all([
      getSpecificPhraseFlags(text),
      getStructuralFlags(text)
    ]);

    const combined = [...regexFlags];
    [...approach1, ...approach2].forEach(flag => {
      if (!combined.find(f => f.phrase.toLowerCase() === flag.phrase.toLowerCase())) {
        combined.push(flag);
      }
    });

    return combined.sort((a, b) => b.weight - a.weight);
  } catch {
    return regexFlags;
  }
}

async function getSpecificPhraseFlags(text) {
  const prompt = `Find exact phrases in this text that AI detectors commonly flag. Focus on:

1. Corporate buzzwords (utilize, leverage, implement, optimize, facilitate)
2. Overused transitions (furthermore, moreover, therefore, thus)
3. Generic academic phrases (plays a crucial role, of paramount importance)
4. Meta-commentary (this essay will, this paper discusses)

Return JSON array: [{"phrase": "exact text", "issue": "why flagged", "suggestedFix": "replacement"}]

Text: """${text}"""`;

  const result = await callOpenAI([
    { role: "system", content: "Extract exact phrases that AI detectors flag. Return only valid JSON." },
    { role: "user", content: prompt }
  ], 0.2);

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.map(item => ({
      phrase: String(item.phrase || ""),
      explanation: String(item.issue || "AI detection trigger"),
      suggestedFix: String(item.suggestedFix || "rewrite naturally"),
      weight: 12,
      severity: "medium",
      occurrences: (text.match(new RegExp(escapeRegex(String(item.phrase)), "gi")) || []).length,
      confidence: 75
    })) : [];
  } catch {
    return [];
  }
}

async function getStructuralFlags(text) {
  const prompt = `Analyze this text for structural patterns that AI detectors flag:

1. Repetitive sentence beginnings
2. Uniform sentence lengths
3. Overuse of passive voice
4. Lack of conversational elements
5. Overly formal register for the context

Return JSON array focusing on structural issues: [{"phrase": "example", "issue": "structural problem", "suggestedFix": "how to fix"}]

Text: """${text}"""`;

  const result = await callOpenAI([
    { role: "system", content: "Identify structural AI patterns. Return only valid JSON." },
    { role: "user", content: prompt }
  ], 0.2);

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.map(item => ({
      phrase: String(item.phrase || ""),
      explanation: String(item.issue || "Structural AI pattern"),
      suggestedFix: String(item.suggestedFix || "vary structure"),
      weight: 10,
      severity: "medium",
      occurrences: 1,
      confidence: 70
    })) : [];
  } catch {
    return [];
  }
}

// ================== API ==================
app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", flags = [], iteration = 1 } = req.body || {};

    if (!essay || typeof essay !== "string" || essay.trim().length < 50 || essay.length > 10000) {
      return res.status(200).json({ error: true, message: "Text must be 50–10,000 characters." });
    }
    if (!OPENAI_API_KEY) {
      return res.status(200).json({ error: true, message: "Server missing OpenAI key." });
    }

    if (action === "fix_flags") {
      const fixedText = await fixSpecificFlags(essay, flags);
      const originalScore = await getEnsembleAIScore(essay);
      const newScoreRaw = await getEnsembleAIScore(fixedText);
      const fixedFlags = await detectWithAdvancedFallback(fixedText);
      const newScore = calibrateByFlags(newScoreRaw, fixedFlags);

      return res.status(200).json({
        fixedText,
        text: fixedText,
        originalScore,
        newScore,
        originalSus: toSus(originalScore),
        newSus: toSus(newScore),
        flags: fixedFlags.slice(0, 10)
      });
    }

    if (action === "rewrite" || action === "humanize") {
      const humanized = await reliableHumanize(essay, iteration);
      const scoreRaw = await getEnsembleAIScore(humanized);
      const flagsNew = await detectWithAdvancedFallback(humanized);
      const score = calibrateByFlags(scoreRaw, flagsNew);
      return res.status(200).json({ 
        humanizedText: humanized, 
        newScore: score, 
        sus: toSus(score), 
        flags: flagsNew.slice(0,10) 
      });
    }

    // Main analysis with ensemble scoring
    const flagsFound = await detectWithAdvancedFallback(essay);
    const scoreRaw = await getEnsembleAIScore(essay);
    const score = calibrateByFlags(scoreRaw, flagsFound);

    return res.status(200).json({
      score: Math.round(score),
      sus: toSus(score),
      reasoning: getAdvancedReasoning(score, flagsFound),
      flags: flagsFound.slice(0, 10),
      proTip: getRealisticTip(score),
      confidence: getConfidenceScore(flagsFound)
    });

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(200).json({ error: true, message: "Analysis failed: " + err.message });
  }
});

// ================== ENHANCED HELPER FUNCTIONS ==================

function getAdvancedReasoning(score, flags) {
  const highConfidenceFlags = flags.filter(f => f.confidence >= 80).length;
  const mediumConfidenceFlags = flags.filter(f => f.confidence >= 60 && f.confidence < 80).length;
  
  if (score >= 80) return `CRITICAL RISK (${score}%) — Multiple AI detectors would likely flag this. ${highConfidenceFlags} high-confidence triggers found.`;
  if (score >= 60) return `HIGH RISK (${score}%) — Strong likelihood of detection. ${flags.length} patterns detected, ${highConfidenceFlags} high-confidence.`;
  if (score >= 40) return `MODERATE RISK (${score}%) — Some detectors might flag this. ${mediumConfidenceFlags + highConfidenceFlags} notable patterns.`;
  if (score >= 20) return `LOW RISK (${score}%) — Mostly safe, minor patterns detected.`;
  return `MINIMAL RISK (${score}%) — Very low detection probability.`;
}

function getConfidenceScore(flags) {
  if (!flags.length) return 95;
  const avgConfidence = flags.reduce((sum, f) => sum + (f.confidence || 70), 0) / flags.length;
  return Math.round(avgConfidence);
}

// Enhanced calibration based on flag confidence
function calibrateByFlags(rawScore, flags) {
  const highConfFlags = flags.filter(f => (f.confidence || 70) >= 80);
  const weightSum = flags.reduce((a, f) => a + (f.weight || 0), 0);
  
  let adjusted = rawScore;

  // Boost score if we have high-confidence flags
  if (highConfFlags.length >= 2 && weightSum >= 35) {
    adjusted = Math.max(adjusted, 75);
  } else if (highConfFlags.length >= 1 && weightSum >= 25) {
    adjusted = Math.max(adjusted, 50);
  }

  adjusted = Math.round(Math.max(0, Math.min(100, CAL_SLOPE * adjusted + CAL_OFFSET)));
  return adjusted;
}

// Helper function to call OpenAI and parse numeric response
async function callOpenAI(messages, temperature = 0.3) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
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
  
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`OpenAI ${r.status} ${t}`);
  }
  
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content || "";
  
  // Try to extract number if this is a scoring call
  const numMatch = content.match(/\d+/);
  if (numMatch && messages.some(m => m.content.includes('Return only a number'))) {
    const num = parseInt(numMatch[0], 10);
    return Math.max(0, Math.min(100, num));
  }
  
  return content.trim();
}

// Keep existing helper functions
function toSus(pct) {
  const n = Math.max(0, Math.min(100, Math.round(pct)));
  if (n >= 70) return { percent: n, band: "high", label: "SUS AF" };
  if (n >= 30) return { percent: n, band: "medium", label: "KINDA SUS" };
  return { percent: n, band: "low", label: "SUS FREE" };
}

function getRealisticTip(score) {
  if (score >= 80) return "CRITICAL: Major rewrite needed to avoid detection.";
  if (score >= 60) return "HIGH RISK: Address the highlighted issues and restructure.";
  if (score >= 40) return "MODERATE: Fix the flagged phrases and vary sentence rhythm.";
  if (score >= 20) return "LOW: A light pass will make it even safer.";
  return "EXCELLENT: Very low detection risk.";
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function createTextHash(text) {
  let h = 0; for (let i = 0; i < text.length; i++) { h = ((h << 5) - h) + text.charCodeAt(i); h |= 0; }
  return h.toString();
}

// Keep existing rewrite functions
async function reliableHumanize(text, iteration = 1) {
  const aggressiveness = Math.max(0, Math.min(1, (iteration - 1) * 0.35));
  return await humanizeWithOpenAI(text, aggressiveness);
}

async function humanizeWithOpenAI(text, aggressiveness = 0) {
  const system = `You rewrite text to sound like natural human academic writing that avoids AI-detector patterns.
- Replace corporate buzzwords (utilize→use, leverage→use, facilitate→help, implement→set up, optimize→improve)
- Vary sentence length (burstiness), mix simple + complex
- Prefer conversational-academic tone over formal-corporate
- Swap formal transitions (furthermore→also, moreover→plus, therefore→so)
- Keep meaning and facts intact; avoid filler`;

  const user = `Rewrite${aggressiveness >= 0.7 ? " aggressively" : aggressiveness >= 0.35 ? " with moderate restructuring" : " gently"} to reduce AI-detection risk while preserving meaning.

Text:
"""${text}"""

Return ONLY the rewritten text.`;

  const out = await callOpenAI([
    { role: "system", content: system },
    { role: "user", content: user }
  ], 0.4 + aggressiveness * 0.3);
  
  return out;
}

async function fixSpecificFlags(fullText, flags) {
  if (!Array.isArray(flags) || flags.length === 0) return fullText;
  let text = fullText;

  const ordered = [...flags].sort((a, b) =>
    text.lastIndexOf(a.phrase || "") < text.lastIndexOf(b.phrase || "") ? 1 : -1
  );

  for (const f of ordered) {
    const raw = (f.phrase || "").trim();
    if (!raw) continue;

    const base = (f.suggestedFix && f.suggestedFix.trim()) || " ";
    const replacement = await contextualReplacement(text, raw, base);

    const isWord = /^[A-Za-z][A-Za-z'-]*$/.test(raw);
    const source = isWord ? `\\b${escapeRegex(raw)}\\b` : escapeRegex(raw);
    const rx = new RegExp(source, "g");

    text = text.replace(rx, (m) => {
      if (m === m.toUpperCase()) return replacement.toUpperCase();
      if (m[0] === m[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
      return replacement;
    });
  }
  return text;
}

async function contextualReplacement(fullText, flaggedPhrase, baseFix) {
  try {
    const sentences = fullText.split(/(?<=[.!?])\s+/).filter(Boolean);
    const sentence = sentences.find(s => s.toLowerCase().includes(flaggedPhrase.toLowerCase())) || flaggedPhrase;

    const prompt = `Replace the flagged phrase with a natural alternative that fits this sentence.

Sentence: "${sentence}"
Flagged phrase: "${flaggedPhrase}"
Base suggestion: "${baseFix}"

Return ONLY the replacement phrase (no quotes).`;
    
    const out = await callOpenAI([
      { role: "system", content: "Return short replacement phrases only." },
      { role: "user", content: prompt }
    ], 0.3);
    
    const ans = out.trim();
    return ans && !/[\n\r]/.test(ans) ? ans : baseFix;
  } catch {
    return baseFix;
  }
}

app.listen(PORT, () => {
  console.log(`Enhanced AI Detection Predictor running on ${PORT}`);
});
