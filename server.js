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
      const humanizedText = await humanizeWithOpenAI(essay);
      return res.status(200).json({ humanizedText });
    }

    if (action === "humanize" || action === "rewrite") {
      const humanizedText = await humanizeWithOpenAI(essay);
      return res.status(200).json({ humanizedText });
    }

    // Main analysis - NOW DETERMINISTIC WITH CACHING
    const analysis = await analyzeDeterministic(essay, processed_phrases, session_id);
    
    // Try to get humanized text (non-blocking)
    try {
      analysis.humanizedText = await humanizeWithOpenAI(essay);
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

// ---------- DETERMINISTIC ANALYSIS WITH CACHING ----------

function analyzeDeterministic(text, processedPhrases = [], sessionId = null) {
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
  
  // Ensure minimum 3 flags for Pro feature display (2 visible + 1 blurred)
  const flagsToReturn = availableFlags.slice(0, Math.max(3, availableFlags.length));
  
  // Calculate score based on weighted flags
  let score = 25 + flagsToReturn.reduce((sum, flag) => sum + (flag.weight || 12), 0);
  if (flagsToReturn.length === 0) score = 15;
  if (flagsToReturn.length > 5) score = Math.min(95, score + 10);
  score = Math.min(95, score); // Cap at 95%
  
  return {
    score: Math.round(score),
    reasoning: `Analysis shows ${flagsToReturn.length} AI detection patterns. ${flagsToReturn.length > 3 ? 'Multiple formal language issues detected.' : flagsToReturn.length > 1 ? 'Some corporate language patterns found.' : 'Minimal detection risks remaining.'}`,
    flags: flagsToReturn,
    proTip: "Replace formal business language with more natural academic alternatives."
  };
}

function generateAllFlags(text) {
  const flagPatterns = [
    // CORPORATE/BUSINESS PATTERNS
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
      phrases: ["seamlessly integrate", "seamlessly integrating"],
      severity: "CRITICAL", weight: 18, issue: "Corporate Phrase",
      explanation: "Common AI pattern in business writing",
      suggestedFix: "easily combine"
    },
    {
      phrases: ["operational efficiency"],
      severity: "HIGH", weight: 16, issue: "Corporate Jargon",
      explanation: "Business buzzword commonly used by AI",
      suggestedFix: "work efficiency"
    },

    // ACADEMIC WRITING PATTERNS
    {
      phrases: ["it is evident that", "it is clear that"],
      severity: "HIGH", weight: 14, issue: "Academic Formality",
      explanation: "Overly formal academic phrase common in AI writing",
      suggestedFix: "clearly"
    },
    {
      phrases: ["the results indicate", "the data indicates"],
      severity: "MEDIUM", weight: 10, issue: "Scientific Language",
      explanation: "Formal research language that sounds AI-generated",
      suggestedFix: "our results show"
    },
    {
      phrases: ["further research is needed", "additional research is required"],
      severity: "HIGH", weight: 15, issue: "Academic Cliché",
      explanation: "Overused conclusion phrase in AI-generated academic writing",
      suggestedFix: "more studies could explore this"
    },
    {
      phrases: ["throughout history", "throughout the ages"],
      severity: "MEDIUM", weight: 9, issue: "Historical Cliché",
      explanation: "Generic historical phrase common in AI writing",
      suggestedFix: "over time"
    },
    {
      phrases: ["it can be argued that", "one could argue that"],
      severity: "MEDIUM", weight: 11, issue: "Academic Hedging",
      explanation: "Formal academic hedging that sounds AI-generated",
      suggestedFix: "some might say"
    },
    {
      phrases: ["the author demonstrates", "the writer demonstrates"],
      severity: "MEDIUM", weight: 9, issue: "Literary Analysis",
      explanation: "Common formal phrase in AI-generated literary analysis",
      suggestedFix: "the author shows",
      contextExclusions: ["protest", "against", "march"]
    },
    {
      phrases: ["this exemplifies", "this illustrates"],
      severity: "MEDIUM", weight: 8, issue: "Academic Language",
      explanation: "Formal analytical language common in AI writing",
      suggestedFix: "this shows"
    },

    // TRANSITIONS AND CONNECTORS  
    {
      phrases: ["furthermore", "moreover"],
      severity: "MEDIUM", weight: 10, issue: "Formal Transition",
      explanation: "Overly formal connector that sounds AI-generated",
      suggestedFix: "also"
    },
    {
      phrases: ["in addition to this", "in addition to that"],
      severity: "MEDIUM", weight: 9, issue: "Formal Transition",
      explanation: "Wordy formal transition common in AI writing",
      suggestedFix: "plus"
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

    // PERSONAL STATEMENT PATTERNS
    {
      phrases: ["I have always been passionate about", "I am passionate about"],
      severity: "HIGH", weight: 16, issue: "Personal Statement Cliché",
      explanation: "Overused phrase in AI-generated personal statements",
      suggestedFix: "I really care about"
    },
    {
      phrases: ["this experience taught me", "this taught me"],
      severity: "MEDIUM", weight: 11, issue: "Reflection Cliché",
      explanation: "Common AI pattern in personal reflections",
      suggestedFix: "I learned"
    },
    {
      phrases: ["I realized the importance of", "I came to understand"],
      severity: "MEDIUM", weight: 10, issue: "Personal Insight",
      explanation: "Generic insight phrase common in AI writing",
      suggestedFix: "I saw how important"
    },

    // SCIENTIFIC/TECHNICAL PATTERNS
    {
      phrases: ["the process involves", "the method involves"],
      severity: "MEDIUM", weight: 8, issue: "Technical Language",
      explanation: "Formal technical language that sounds AI-generated",
      suggestedFix: "the process includes"
    },
    {
      phrases: ["optimal performance", "maximum efficiency"],
      severity: "HIGH", weight: 13, issue: "Technical Jargon",
      explanation: "Technical buzzwords common in AI writing",
      suggestedFix: "best performance"
    },
    {
      phrases: ["it is well established that", "it is widely known that"],
      severity: "HIGH", weight: 14, issue: "Scientific Authority",
      explanation: "Formal scientific authority phrase that sounds AI-generated",
      suggestedFix: "we know that"
    },

    // QUALIFYING LANGUAGE
    {
      phrases: ["significant", "significantly"],
      severity: "MEDIUM", weight: 8, issue: "Formal Language",
      explanation: "Overused formal qualifier in AI writing",
      suggestedFix: "important",
      contextExclusions: ["other", "relationship", "figure", "digit", "statistical"]
    },
    {
      phrases: ["substantial", "substantially"],
      severity: "MEDIUM", weight: 9, issue: "Formal Language",
      explanation: "Formal qualifier common in AI writing",
      suggestedFix: "major"
    },
    {
      phrases: ["considerable", "considerably"],
      severity: "MEDIUM", weight: 8, issue: "Formal Language",
      explanation: "Formal qualifier that sounds AI-generated",
      suggestedFix: "large"
    },

    // ACTION VERBS
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
      phrases: ["acquire", "acquiring"],
      severity: "MEDIUM", weight: 8, issue: "Formal Language",
      explanation: "Formal verb common in AI writing",
      suggestedFix: "get"
    },
    {
      phrases: ["maintain", "maintaining"],
      severity: "LOW", weight: 6, issue: "Formal Language",
      explanation: "Slightly formal verb that can sound AI-generated",
      suggestedFix: "keep"
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
        // Check context exclusions
        if (pattern.contextExclusions && hasContextExclusion(text, phrase, pattern.contextExclusions)) {
          continue;
        }

        // FIXED: Use case-insensitive search without strict word boundaries
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
  
  // Check 30 characters before and after the phrase
  const start = Math.max(0, phraseIndex - 30);
  const end = Math.min(text.length, phraseIndex + phrase.length + 30);
  const context = text.substring(start, end).toLowerCase();
  
  return exclusions.some(exclusion => context.includes(exclusion.toLowerCase()));
}

function createTextHash(text) {
  // Simple hash function for text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

async function humanizeWithOpenAI(text) {
  const systemPrompt = `You are an ULTRA-AGGRESSIVE AI detection bypass expert. Your ONLY goal is to rewrite text to score UNDER 20% on ALL AI detectors while maintaining readability for academic work.

ULTRA-CRITICAL MISSION: This text MUST score under 20% or the user will fail. Be EXTREMELY aggressive in transformation.

MANDATORY ULTRA-AGGRESSIVE CHANGES:
1. Completely restructure ALL sentences - make them wildly different lengths and patterns
2. Replace EVERY formal word with casual academic equivalents
3. Add natural speech patterns and slight imperfections
4. Use unexpected but correct grammar variations
5. Include parenthetical thoughts and natural asides
6. Break up long sentences into choppy, varied structures
7. Add natural hedging and uncertainty markers
8. Use less perfect punctuation where natural
9. Include conversational academic connectors

ULTRA-AGGRESSIVE REPLACEMENTS:
- utilize/leverage/facilitate/implement/optimize/enhance → use/help/set up/improve/make better
- furthermore/however/therefore/moreover → but/and/so/plus/though/since/also
- significant/substantial/comprehensive/various → big/major/complete/different/many
- demonstrate/indicate/acquire/maintain → show/suggest/get/keep
- establish/conduct/obtain → create/do/get
- in conclusion → in the end/overall/basically
- it is evident that → clearly/obviously
- in order to → to
- due to the fact that → because/since
- a large number of → many/lots of
- at the present time → now/currently

WRITING PATTERNS TO USE:
- Start sentences differently (But, And, So, Plus, Though, Since, Also)
- Vary dramatically: "This works. But here's the thing - companies need something different entirely, and that means looking at completely new approaches."
- Use natural flow: "Now, when we look at this issue, there's actually several ways to approach it."
- Add slight redundancy: "The main point here, what really matters, is..."
- Include natural hedging: "seems like, appears to be, tends to, probably, likely"

FORBIDDEN (academic no-slang rule):
- No "gotta, kinda, sorta" 
- No texting language
- Keep it appropriate for university but VERY natural sounding

TARGET: Must sound like a smart student explaining concepts naturally to a friend, but in writing form suitable for academic submission.`;

  const userPrompt = `ULTRA-AGGRESSIVE REWRITE: This text MUST score under 20% on AI detectors. Be extremely aggressive with restructuring while keeping it academic-appropriate:

"${escapeQuotes(text)}"

Make it sound completely natural and human-written. Transform it dramatically but keep it suitable for university work.

Return ONLY the rewritten text.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 0.4); // Maximum creativity for human variation

  return result.trim();
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
      model: "gpt-4o-mini", // Cost-efficient model
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

