import express from "express";
import cors from "cors";

// ----- CONFIG -----
const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const allowedOrigins = [
  "https://dontturnitinyet.com",
  "https://www.dontturnitinyet.com",
  "http://localhost:3000",
  "http://localhost:5173"
];

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    return cb(null, true);
  }
}));

app.get("/health", (req, res) => res.json({ ok: true }));

const originalAnalyses = new Map();
const scoreCache = new Map();

app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", processed_phrases, session_id } = req.body || {};
    
    if (!essay || typeof essay !== "string" || essay.trim().length < 50 || essay.length > 10000) {
      return res.status(200).json({ 
        error: true, 
        message: "Text must be 50–10,000 characters." 
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({ 
        error: true, 
        message: "Server missing OpenAI key." 
      });
    }

    // Handle rewrite with NEW SCORE
    if (action === "humanize" || action === "rewrite") {
      const humanizedText = await reliableHumanize(essay);
      const newScore = await getReliableGPTScore(humanizedText);
      return res.status(200).json({ 
        humanizedText,
        newScore: newScore
      });
    }

    // Main analysis
    const analysis = await analyzeDeterministic(essay, processed_phrases, session_id);
    
    try {
      analysis.humanizedText = await reliableHumanize(essay);
      analysis.newScore = await getReliableGPTScore(analysis.humanizedText);
    } catch (err) {
      console.log("Humanize failed:", err.message);
      analysis.humanizedText = "Rewrite temporarily unavailable.";
    }
    
    return res.status(200).json(analysis);

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(200).json({ 
      error: true, 
      message: "Analysis failed: " + err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

async function getReliableGPTScore(text) {
  const textHash = createTextHash(text);
  
  if (scoreCache.has(textHash)) {
    return scoreCache.get(textHash);
  }

  const prompt = `You are an expert AI detection system. Analyze this text and rate its AI detection risk from 0-100%.

SCORING GUIDELINES:
- 0-29%: Natural human writing with varied sentence structure and authentic voice
- 30-59%: Somewhat formulaic but could be human academic writing
- 60-89%: Strong AI patterns - formal, repetitive, lacks personality  
- 90-100%: Obviously AI-generated with generic phrasing

Text: "${escapeQuotes(text)}"

Respond with just a number 0-100.`;

  try {
    const result = await callOpenAI([
      { role: "system", content: "You are a precise AI detection expert. Always respond with just a number 0-100." },
      { role: "user", content: prompt }
    ], 0.1);

    const score = parseInt(result.trim());
    if (score >= 0 && score <= 100) {
      scoreCache.set(textHash, score);
      return score;
    }
    
    throw new Error("Invalid score");
  } catch (err) {
    console.log("GPT scoring failed:", err.message);
    throw new Error("Analysis unavailable");
  }
}

async function analyzeDeterministic(text, processedPhrases = [], sessionId = null) {
  const processedSet = new Set((processedPhrases || []).map(p => p.toLowerCase().trim()));
  const textKey = sessionId || createTextHash(text);
  
  if (!originalAnalyses.has(textKey)) {
    const allPossibleFlags = generateAllFlags(text);
    originalAnalyses.set(textKey, allPossibleFlags);
  }
  
  const originalFlags = originalAnalyses.get(textKey);
  
  const availableFlags = originalFlags.filter(flag => {
    const flagPhrase = flag.phrase.toLowerCase().trim();
    const suggestedFix = flag.suggestedFix.toLowerCase().trim();
    
    if (processedSet.has(flagPhrase) || processedSet.has(suggestedFix)) {
      return false;
    }
    
    if (!text.toLowerCase().includes(flagPhrase)) {
      return false;
    }
    
    return true;
  });
  
  const flagsToReturn = availableFlags.slice(0, 4);
  const score = await getReliableGPTScore(text);
  
  return {
    score: Math.round(score),
    reasoning: generateScoreReasoning(score, flagsToReturn.length),
    flags: flagsToReturn,
    proTip: getScoreSpecificTip(score)
  };
}

function generateScoreReasoning(score, flagCount) {
  if (score >= 60) {
    return `High AI detection risk (${score}%). Found ${flagCount} problematic patterns.`;
  } else if (score >= 30) {
    return `Moderate AI detection risk (${score}%). Found ${flagCount} potential issues.`;
  } else {
    return `Low AI detection risk (${score}%). ${flagCount === 0 ? 'No major red flags' : 'Only minor issues'} found.`;
  }
}

function getScoreSpecificTip(score) {
  if (score >= 60) {
    return "Urgent: Use 'Rewrite Text' to significantly reduce AI detection risk.";
  } else if (score >= 30) {
    return "Recommended: Consider using 'Rewrite Text' or address flagged phrases.";
  } else {
    return "Excellent: Text should pass most AI detection tools.";
  }
}

async function reliableHumanize(text, targetScore = 25) {
  const rewrittenText = await humanizeWithOpenAI(text);
  const newScore = await getReliableGPTScore(rewrittenText);
  
  if (newScore <= targetScore) {
    return rewrittenText;
  }
  
  const secondRewrite = await humanizeWithOpenAI(rewrittenText, true);
  const finalScore = await getReliableGPTScore(secondRewrite);
  
  return finalScore <= newScore ? secondRewrite : rewrittenText;
}

async function humanizeWithOpenAI(text, aggressive = false) {
  const systemPrompt = `You are an expert at making text sound completely human and natural while maintaining academic appropriateness.

GOAL: Transform this text to score UNDER 25% on AI detection tools.

CHANGES NEEDED:
1. Restructure sentences - vary lengths dramatically
2. Replace formal language with natural alternatives  
3. Add natural speech patterns
4. Use conversational but academic language
5. Include hedging words (seems, appears, probably)
6. Add personality and human perspective

REPLACEMENTS:
- utilize/leverage/facilitate → use/help/work with
- furthermore/moreover → also/plus/and/but
- significant/substantial → big/major/important
- implement/establish → set up/create
- optimize/enhance → improve/make better

Keep it suitable for university but make it sound naturally written.`;

  const userPrompt = `Transform this text to sound human (target: under 25% AI detection):

"${escapeQuotes(text)}"

Return ONLY the rewritten text.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], aggressive ? 0.8 : 0.6);

  return result.trim();
}

function generateAllFlags(text) {
  const flagPatterns = [
    {
      phrases: ["utilize", "utilizes", "utilizing", "utilization"],
      severity: "HIGH", weight: 15, issue: "Corporate Buzzword",
      explanation: "This formal corporate term sounds AI-generated",
      suggestedFix: "use"
    },
    {
      phrases: ["leverage", "leverages", "leveraging"],
      severity: "HIGH", weight: 15, issue: "Business Jargon", 
      explanation: "Corporate buzzword that triggers AI detection",
      suggestedFix: "use"
    },
    {
      phrases: ["optimize", "optimizes", "optimizing"],
      severity: "HIGH", weight: 14, issue: "Corporate Language",
      explanation: "Overly corporate term common in AI writing",
      suggestedFix: "improve"
    },
    {
      phrases: ["facilitate", "facilitates", "facilitating"],
      severity: "HIGH", weight: 15, issue: "Formal Language",
      explanation: "Formal business term that sounds AI-generated",
      suggestedFix: "help"
    },
    {
      phrases: ["furthermore", "moreover"],
      severity: "MEDIUM", weight: 10, issue: "Formal Transition",
      explanation: "Overly formal connector that sounds AI-generated",
      suggestedFix: "also"
    },
    {
      phrases: ["implement", "implements", "implementing"],
      severity: "HIGH", weight: 12, issue: "Corporate Buzzword",
      explanation: "Common AI-generated business language",
      suggestedFix: "set up"
    },
    {
      phrases: ["enhance", "enhances", "enhancing"],
      severity: "MEDIUM", weight: 9, issue: "Formal Language", 
      explanation: "Overly formal term common in AI writing",
      suggestedFix: "improve"
    }
  ];

  const foundFlags = [];
  const textLower = text.toLowerCase();

  for (const pattern of flagPatterns) {
    for (const phrase of pattern.phrases) {
      if (textLower.includes(phrase.toLowerCase())) {
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const match = text.match(regex);
        
        if (match) {
          foundFlags.push({
            issue: pattern.issue,
            phrase: match[0],
            explanation: pattern.explanation,
            suggestedFix: pattern.suggestedFix,
            weight: pattern.weight,
            severity: pattern.severity
          });
          break;
        }
      }
    }
  }

  return foundFlags;
}

function createTextHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function escapeQuotes(str) {
  return str.replace(/"/g, '\\"');
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
      messages: messages,
      temperature: temperature,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }
  
  return content;
}
