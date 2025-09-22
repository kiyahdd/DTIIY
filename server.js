// server.js — DontTurnItInYet (Scoring aligned + robust flags)
// Drop-in: replaces your current file. Non-score behaviors preserved.

import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/health", (req, res) => res.json({ ok: true }));

// --- Optional tiny calibration to nudge % if you ever need it ---
const CAL_SLOPE = Number(process.env.SUS_CAL_SLOPE || 1.0); // 1 = no change
const CAL_OFFSET = Number(process.env.SUS_CAL_OFFSET || 0);  // 0 = no change

const scoreCache = new Map();

// ============ API ============
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
      const originalScore = await getGPTZeroCompatibleScore(essay);
      const newScore = await getGPTZeroCompatibleScore(fixedText);

      return res.status(200).json({
        fixedText,
        text: fixedText,
        originalScore,
        newScore,
        originalSus: toSus(originalScore),
        newSus: toSus(newScore),
      });
    }

    if (action === "rewrite" || action === "humanize") {
      const humanized = await reliableHumanize(essay, iteration);
      const score = await getGPTZeroCompatibleScore(humanized);
      return res.status(200).json({ humanizedText: humanized, newScore: score, sus: toSus(score) });
    }

    // Main analysis
    const flagsFound = detectRealAIPatterns(essay);
    const score = await getGPTZeroCompatibleScore(essay);

    return res.status(200).json({
      score: Math.round(score),
      sus: toSus(score),
      reasoning: getGPTZeroReasoning(score, flagsFound.length),
      flags: flagsFound.slice(0, 10),
      proTip: getRealisticTip(score),
    });

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(200).json({ error: true, message: "Analysis failed: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on ${PORT} — GPTZero-aligned scoring + robust flags`);
});

// ============ SCORING (the “perfect” one you liked) ============
async function getGPTZeroCompatibleScore(text) {
  const textHash = createTextHash(text);
  if (scoreCache.has(textHash)) return scoreCache.get(textHash);

  const prompt = `You are an expert AI detection system like GPTZero and Turnitin. Analyze this text and rate its AI detection risk from 0-100%.

SCORING GUIDELINES:
- 0-25%: Natural human writing with varied sentence structure, personality, and authentic voice
- 26-45%: Mostly human but some formulaic patterns
- 46-65%: Mixed—could be human academic writing but has AI-like patterns
- 66-85%: Strong AI patterns—formal, repetitive, generic phrasing, lacks personality
- 86-100%: Obviously AI-generated with robotic phrasing and structure

Consider these triggers:
- Overuse of formal transitions (furthermore, moreover, in conclusion)
- Corporate buzzwords (utilize, leverage, facilitate, optimize, implement)
- Generic academic phrases (it is important to note, plays a crucial role)
- Repetitive sentence structures, low burstiness
- Overly perfect grammar without human quirks

Text: "${String(text).replace(/"/g, '\\"')}"

Respond with just a number 0-100.`;

  try {
    const result = await callOpenAI(
      [
        { role: "system", content: "You are a precise AI detection expert. Always respond with just a number 0-100." },
        { role: "user", content: prompt }
      ],
      0.1 // low temp => stable
    );

    const raw = (result || "").trim();
    const score = parseInt(raw, 10);
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error("non-numeric");

    scoreCache.set(textHash, score);
    return score;
  } catch {
    // keep strict behavior: don’t guess; surface as error up the stack
    throw new Error("Analysis unavailable");
  }
}

function toSus(raw) {
  const pct = Math.max(0, Math.min(100, Math.round(CAL_SLOPE * raw + CAL_OFFSET)));
  if (pct >= 70) return { percent: pct, band: "high",   label: "SUS AF" };
  if (pct >= 30) return { percent: pct, band: "medium", label: "KINDA SUS" };
  return                 { percent: pct, band: "low",    label: "SUS FREE" };
}

// ============ FLAG DETECTOR (broad + morphology-aware) ============
function detectRealAIPatterns(text) {
  // Each pattern uses regex with word boundaries and flexible endings (ed/s/ing/ation…)
  const P = [
    // Corporate / buzzwords (HIGH)
    { rx: /\butili[sz]e(?:d|s|r|rs|ing|ation)?\b/gi, weight: 16, exp: "AI prefers 'utilize' over natural 'use'", fix: "use" },
    { rx: /\bleverage(?:d|s|ing)?\b/gi,              weight: 16, exp: "Corporate buzzword; reads robotic",      fix: "use" },
    { rx: /\bimplement(?:ed|s|ing|ation)?\b/gi,      weight: 15, exp: "Generic business verb common in AI",     fix: "set up" },
    { rx: /\boptimi[sz]e(?:d|s|ing|ation)?\b/gi,     weight: 14, exp: "Technical buzzword",                      fix: "improve" },
    { rx: /\benhance(?:d|s|ing|ment)?\b/gi,          weight: 12, exp: "Overly formal verb",                      fix: "improve" },
    { rx: /\bfacilitat(?:e|es|ed|ing|ion)\b/gi,      weight: 12, exp: "Formal register; AI-like",                fix: "help" },
    { rx: /\bstreamlin(?:e|es|ed|ing)\b/gi,          weight: 11, exp: "Corporate process jargon",                fix: "simplify" },
    { rx: /\bcutting[- ]edge\b/gi,                   weight: 11, exp: "Marketing-y phrasing",                    fix: "new" },
    { rx: /\bunprecedented\b/gi,                     weight: 11, exp: "Dramatic superlative",                    fix: "unusual" },

    // Formal transitions (MED)
    { rx: /\bfurthermore\b/gi,                       weight: 12, exp: "Overly formal transition",                fix: "also" },
    { rx: /\bmoreover\b/gi,                          weight: 12, exp: "Overly formal transition",                fix: "plus" },
    { rx: /\btherefore\b|\bthus\b|\bhence\b/gi,      weight: 10, exp: "Academic connector",                      fix: "so" },
    { rx: /\badditionally\b|\bconsequently\b/gi,     weight: 10, exp: "Heavy transition usage",                  fix: "also" },

    // Academic clichés (MED)
    { rx: /\bit is (important|critical) to note\b/gi, weight: 13, exp: "Formulaic academic phrase",              fix: "notably" },
    { rx: /\bplays a crucial role\b/gi,               weight: 12, exp: "Overused academic phrase",               fix: "is important for" },
    { rx: /\bof paramount importance\b/gi,            weight: 13, exp: "Exaggerated formal language",            fix: "very important" },
    { rx: /\bsignificant (impact|effect)\b/gi,        weight: 11, exp: "Generic phrasing",                       fix: "major impact" },
    { rx: /\bcomprehensive (?:approach|solution)?\b/gi, weight: 11, exp: "Buzzword filler",                      fix: "complete" },
    { rx: /\bholistic (?:approach|view)?\b/gi,        weight: 11, exp: "Buzzword combo",                         fix: "overall" },

    // Meta-writing (MED)
    { rx: /\b(this (essay|paper|report) will|the purpose of (this|the))\b/gi,
      weight: 19, exp: "Meta commentary about the writing itself", fix: "This explores" },

    // Formulaic starters (LOW)
    { rx: /\bit is (evident|clear) that\b/gi,        weight: 8,  exp: "Formulaic starter",                       fix: "clearly" },
    { rx: /\bthis (underscores|highlights)\b/gi,     weight: 8,  exp: "Formal academic transition",              fix: "this shows" },
  ];

  const flags = [];
  for (const p of P) {
    const matches = [...text.matchAll(p.rx)];
    if (matches.length) {
      const first = matches[0][0];
      flags.push({
        phrase: first,
        explanation: p.exp,
        suggestedFix: p.fix,
        weight: p.weight,
        severity: p.weight >= 13 ? "high" : "medium",
        occurrences: matches.length
      });
    }
  }

  // Highest-impact first
  return flags.sort((a, b) => b.weight - a.weight);
}

// ============ REWRITE (context-aware + progressive) ============
async function reliableHumanize(text, iteration = 1) {
  // progressively more aggressive each pass
  const aggressive = Math.max(0, Math.min(1, (iteration - 1) * 0.35)); // 1st mild, 2nd medium, 3rd spicy
  return await humanizeWithOpenAI(text, aggressive);
}

async function humanizeWithOpenAI(text, aggressiveness = 0) {
  const system = `You rewrite text to sound like natural human academic writing that avoids AI-detector patterns.
- Replace corporate buzzwords (utilize→use, leverage→use, facilitate→help, implement→set up, optimize→improve)
- Vary sentence length (burstiness), mix simple + complex
- Prefer conversational-academic tone over formal-corporate
- Swap formal transitions (furthermore→also, moreover→plus, therefore→so)
- Keep meaning; avoid flowery filler; keep facts intact`;

  const user = `Rewrite gently${aggressiveness >= 0.7 ? " and restructure sentences freely" : aggressiveness >= 0.35 ? " with moderate restructuring" : ""} to reduce AI-detection risk while preserving meaning.

Text:
"""${text}"""

Return ONLY the rewritten text.`;

  const out = await callOpenAI(
    [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    0.4 + aggressiveness * 0.3
  );
  return out.trim();
}

// ============ Fix specific phrases (safe + contextual) ============
async function fixSpecificFlags(fullText, flags) {
  if (!Array.isArray(flags) || flags.length === 0) return fullText;
  let text = fullText;

  // replace from right-to-left to avoid shifting indices
  const ordered = [...flags].sort((a, b) =>
    text.lastIndexOf(a.phrase || "") < text.lastIndexOf(b.phrase || "") ? 1 : -1
  );

  for (const f of ordered) {
    const raw = (f.phrase || "").trim();
    if (!raw) continue;

    // get contextual replacement
    const base = (f.suggestedFix && f.suggestedFix.trim()) || " ";
    const replacement = await contextualReplacement(text, raw, base);

    // word-boundary if simple word; escape otherwise
    const isWord = /^[A-Za-z][A-Za-z'-]*$/.test(raw);
    const source = isWord
      ? `\\b${escapeRegex(raw)}\\b`
      : escapeRegex(raw);
    const rx = new RegExp(source, "g");

    text = text.replace(rx, (m) => {
      // preserve capitalization style
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

    const prompt = `Replace the flagged phrase with a natural alternative that fits the sentence.

Sentence: "${sentence}"
Flagged phrase: "${flaggedPhrase}"
Base suggestion: "${baseFix}"

Return ONLY the replacement phrase (no quotes).`;
    const out = await callOpenAI(
      [
        { role: "system", content: "You return short, natural replacement phrases only." },
        { role: "user", content: prompt }
      ],
      0.3
    );
    const ans = out.trim();
    return ans && !/[\n\r]/.test(ans) ? ans : baseFix;
  } catch {
    return baseFix;
  }
}

// ============ Reasoning/UX helpers ============
function getGPTZeroReasoning(score, n) {
  if (score >= 80) return `HIGH AI DETECTION (${score}%) — likely flagged. ${n} strong AI patterns detected.`;
  if (score >= 60) return `MODERATE-HIGH (${score}%) — significant AI influence. ${n} patterns found.`;
  if (score >= 40) return `MIXED (${score}%) — some AI patterns. ${n} issues to address.`;
  if (score >= 20) return `LOW (${score}%) — mostly human-like. ${n} minor patterns.`;
  return `VERY LOW (${score}%) — likely safe. ${n === 0 ? "No" : "Minimal"} AI patterns.`;
}
function getRealisticTip(score) {
  if (score >= 80) return "CRITICAL: Major rewrite needed to avoid detection.";
  if (score >= 60) return "HIGH RISK: Address the highlighted issues and restructure.";
  if (score >= 40) return "MODERATE: Fix the flagged phrases and vary sentence rhythm.";
  if (score >= 20) return "LOW: A light pass will make it even safer.";
  return "EXCELLENT: Very low detection risk.";
}

// ============ Shared utilities ============
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function createTextHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = ((h << 5) - h) + text.charCodeAt(i); h |= 0; }
  return h.toString();
}

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
  return data?.choices?.[0]?.message?.content || "";
}
