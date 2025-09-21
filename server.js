import express from "express";
import cors from "cors";

// ----- CONFIG -----
const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Allow your WordPress site
const allowedOrigins = [
  "https://dontturnitinyet.com",
  "https://www.dontturnitinyet.com",
  "http://localhost:3000",
  "http://localhost:5173"
];

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
      return cb(null, true); // Relaxed CORS for setup
    }
  })
);

// Health check endpoint
app.get("/health", (req, res) => res.json({ ok: true }));

// Cache for original analyses - prevents new phrases from appearing
const originalAnalyses = new Map();
const scoreCache = new Map(); // Cache GPT scores to avoid re-scoring same text

// Main analyze endpoint
app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", style, instructions, processed_phrases, session_id } = req.body || {};
    
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

    // Handle academic humanization specifically
    if (action === "humanize_academic" || action === "bypass_ai_detection") {
      const humanizedText = await reliableHumanize(essay);
      return res.status(200).json({ humanizedText });
    }

    if (action === "humanize" || action === "rewrite") {
      const humanizedText = await reliableHumanize(essay);
      return res.status(200).json({ humanizedText });
    }

    // Main analysis - NOW WITH REAL GPT SCORING ONLY
    const analysis = await analyzeDeterministic(essay, processed_phrases, session_id);
    
    // Try to get humanized text (non-blocking)
    try {
      analysis.humanizedText = await reliableHumanize(essay);
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

// ---------- 100% REAL GPT ANALYSIS - NO FAKE SCORING ----------

async function getReliableGPTScore(text) {
  const textHash = createTextHash(text);
  
  // Check cache first
  if (scoreCache.has(textHash)) {
    console.log("Using cached score");
    return scoreCache.get(textHash);
  }

  const prompt = `You are an expert AI detection system used by universities. Analyze this text and rate its AI detection risk from 0-100%.

SCORING GUIDELINES (be realistic):
- 0-29%: Natural human writing with varied sentence structure, personality, and authentic voice
- 30-59%: Somewhat formulaic but could realistically be human academic writing
- 60-89%: Strong AI patterns - overly formal, repetitive, corporate buzzwords, lacks personality
- 90-100%: Obviously AI-generated with generic phrasing, perfect structure, template language

KEY AI INDICATORS:
- Overuse of words like "utilize, leverage, facilitate, implement, optimize"
- Repetitive formal transitions "furthermore, moreover, in addition"
- Generic corporate phrases "operational efficiency, comprehensive solution"
- Perfect grammar with no natural imperfections
- Lack of personal voice, opinion, or unique perspective
- Template-like structure and predictable phrasing

Be accurate - most good human academic writing scores 20-40%. Only obviously AI text should score 70%+.

Text to analyze: "${escapeQuotes(text)}"

Respond with just a number from 0-100.`;

  try {
    const result = await callOpenAI([
      { role: "system", content: "You are a precise AI detection expert. Always respond with just a number 0-100." },
      { role: "user", content: prompt }
    ], 0.1); // Very low temperature for consistency

    const score = parseInt(result.trim());
    if (score >= 0 && score <= 100) {
      console.log(`GPT scored text: ${score}%`);
      scoreCache.set(textHash, score);
      return score;
    }
    
    throw new Error("Invalid score returned");
  } catch (err) {
    console.log("GPT scoring failed:", err.message);
    throw new Error("Real-time analysis unavailable");
  }
}

async function analyzeDeterministic(text, processedPhrases = [], sessionId = null) {
  const processedSet = new Set((processedPhrases || []).map(p => p.toLowerCase().trim()));
  
  // Create unique key for this original text (before any replacements)
  const textKey = sessionId || createTextHash(text);
  
  // If this is the first analysis, generate and cache ALL possible flags
  if (!originalAnalyses.has(textKey)) {
    const allPossibleFlags = generateAllFlags(text);
    originalAnalyses.set(textKey, allPossibleFlags);
    console.log(`Cached ${allPossibleFlags.length} flags for session ${textKey}`);
  }
  
  // Get the original flag list (never changes)
  const originalFlags = originalAnalyses.get(textKey);
  
  // Filter out processed phrases, but ONLY from the original list
  const availableFlags = originalFlags.filter(flag => {
    const flagPhrase = flag.phrase.toLowerCase().trim();
    const suggestedFix = flag.suggestedFix.toLowerCase().trim();
    
    // Skip if this phrase or its replacement was processed
    if (processedSet.has(flagPhrase) || processedSet.has(suggestedFix)) {
      return false;
    }
    
    // Skip if the phrase no longer exists in current text
    if (!text.toLowerCase().includes(flagPhrase)) {
      return false;
    }
    
    return true;
  });
  
  // Limit flags to what frontend can display (4 max: 2 visible + 2 blurred)
  const flagsToReturn = availableFlags.slice(0, 4);
  
  // GET 100% REAL GPT SCORE - NO FALLBACK TO FAKE SCORING
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
    return `High AI detection risk (${score}%). Found ${flagCount} problematic patterns. Text shows strong AI characteristics that will likely trigger detection tools.`;
  } else if (score >= 30) {
    return `Moderate AI detection risk (${score}%). Found ${flagCount} potential issues. Some AI-typical patterns detected but text could pass as human.`;
  } else {
    return `Low AI detection risk (${score}%). ${flagCount === 0 ? 'No major red flags' : 'Only minor issues'} found. Text appears naturally written and should pass detection tools.`;
  }
}

function getScoreSpecificTip(score) {
  if (score >= 60) {
    return "Urgent: Text will likely be flagged. Use 'Rewrite Text' to significantly reduce AI detection risk before submission.";
  } else if (score >= 30) {
    return "Recommended: Consider using 'Rewrite Text' or manually address flagged phrases to reduce detection risk.";
  } else {
    return "Excellent: Text should pass most AI detection tools with minimal risk. Ready for submission.";
  }
}

// ---------- RELIABLE REWRITE WITH REAL VALIDATION ----------

async function reliableHumanize(text, targetScore = 25) {
  console.log(`Starting rewrite, target: ${targetScore}%`);
  
  // First rewrite attempt
  const rewrittenText = await humanizeWithOpenAI(text);
  
  // Score the rewrite to validate improvement
  const newScore = await getReliableGPTScore(rewrittenText);
  
  console.log(`Rewrite scored: ${newScore}% (target: ${targetScore}%)`);
  
  if (newScore <= targetScore) {
    console.log(`Success! Achieved ${newScore}%`);
    return rewrittenText;
  }
  
  // If still too high, try one more aggressive rewrite
  console.log(`Score still high, trying more aggressive rewrite...`);
  const secondRewrite = await humanizeWithOpenAI(rewrittenText, true);
  const finalScore = await getReliableGPTScore(secondRewrite);
  
  console.log(`Second attempt: ${finalScore}%`);
  
  // Return whichever version scored better
  return finalScore <= newScore ? secondRewrite : rewrittenText;
}

async function humanizeWithOpenAI(text, aggressive = false) {
  const systemPrompt = aggressive ? 
    `You are an expert at making text sound EXTREMELY natural and human. This is a second attempt - be MORE aggressive in transformation.

CRITICAL: This text scored too high on AI detection. Make it sound like a real person wrote it naturally.

EXTREME CHANGES NEEDED:
1. Completely change sentence structures - make them very different lengths
2. Add more personality and natural speech patterns  
3. Use more casual academic language
4. Include natural hesitations and hedging
5. Break perfect grammar where it sounds natural
6. Add more human perspective and opinion

Make it sound like a smart student explaining to a friend, but keep it appropriate for university.` :

    `You are an expert at making AI-generated text sound completely human and natural while maintaining academic appropriateness.

CRITICAL GOAL: Transform this text to score UNDER 25% on AI detection tools.

TRANSFORMATION REQUIREMENTS:
1. Completely restructure sentences - vary lengths dramatically (5-30 words)
2. Replace ALL formal/corporate language with natural alternatives
3. Add natural speech patterns and slight imperfections
4. Use conversational but academic-appropriate language
5. Include natural hedging words (seems, appears, tends to, probably)
6. Add personality and human perspective

MANDATORY REPLACEMENTS:
- utilize/leverage/facilitate → use/help/work with
- furthermore/moreover/additionally → also/plus/and/but
- significant/substantial → big/major/important
- implement/establish → set up/create/start
- optimize/enhance → improve/make better
- operational efficiency → work performance
- comprehensive → complete/full
- demonstrate → show

Keep it suitable for university submission but make it sound like a smart student wrote it naturally.`;

  const userPrompt = `Transform this text to sound completely human and natural (target: under 25% AI detection):

"${escapeQuotes(text)}"

Return ONLY the rewritten text.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], aggressive ? 0.8 : 0.6); // Higher creativity for more human variation

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
      phrases: ["comprehensive solution", "comprehensive solutions"],
      severity: "CRITICAL", weight: 20, issue: "Generic AI Phrase",
      explanation: "Classic AI-generated business phrase",
      suggestedFix: "complete approach"
    },
    {
      phrases: ["operational efficiency"],
      severity: "HIGH", weight: 16, issue: "Corporate Jargon",
      explanation: "Business buzzword commonly used by AI",
      suggestedFix: "work efficiency"
    },
    {
      phrases: ["furthermore", "moreover"],
      severity: "MEDIUM", weight: 10, issue: "Formal Transition",
      explanation: "Overly formal connector that sounds AI-generated",
      suggestedFix: "also"
    },
    {
      phrases: ["consequently", "as a consequence"],
      severity: "MEDIUM", weight: 8, issue: "Formal Connector",
      explanation: "Formal logical connector that sounds AI-generated",
      suggestedFix: "so"
    },
    {
      phrases: ["in conclusion", "to conclude"],
      severity: "MEDIUM", weight: 10, issue: "Generic Conclusion",
      explanation: "Overused formal conclusion phrase",
      suggestedFix: "overall"
    },
    {
      phrases: ["implement", "implements", "implementing"],
      severity: "HIGH", weight: 12, issue: "Corporate Buzzword",
      explanation: "Common AI-generated business language",
      suggestedFix: "set up",
      contextExclusions: ["policy", "law", "regulation", "government"]
    },
    {
      phrases: ["establish", "establishing"],
      severity: "MEDIUM", weight: 9, issue: "Formal Language",
      explanation: "Corporate term common in AI-generated text",
      suggestedFix: "create"
    },
    {
      phrases: ["demonstrate", "demonstrates"],
      severity: "MEDIUM", weight: 8, issue: "Academic Formality", 
      explanation: "Overused academic verb in AI writing",
      suggestedFix: "show",
      contextExclusions: ["affection", "love", "protest", "against", "march"]
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
        if (pattern.contextExclusions && hasContextExclusion(text, phrase, pattern.contextExclusions)) {
          continue;
        }

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

function hasContextExclusion(text, phrase, exclusions) {
  if (!exclusions || exclusions.length === 0) return false;
  
  const phraseIndex = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (phraseIndex === -1) return false;
  
  const start = Math.max(0, phraseIndex - 30);
  const end = Math.min(text.length, phraseIndex + phrase.length + 30);
  const context = text.substring(start, end).toLowerCase();
  
  return exclusions.some(exclusion => context.includes(exclusion.toLowerCase()));
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
