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
    const { essay, action = "analyze", processed_phrases, session_id, flags } = req.body || {};
    
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

    // Handle targeted flag fixing (for False Flag Fixer)
    if (action === "fix_flags") {
      const fixedText = await fixSpecificFlags(essay, flags);
      return res.status(200).json({ 
        fixedText,
        text: fixedText,
        originalScore: await getReliableGPTScore(essay),
        newScore: await getReliableGPTScore(fixedText)
      });
    }

    // Handle full rewrite
    if (action === "humanize" || action === "rewrite") {
      const humanizedText = await reliableHumanize(essay);
      const newScore = await getReliableGPTScore(humanizedText);
      return res.status(200).json({ 
        humanizedText,
        newScore: newScore
      });
    }

    // Main analysis with enhanced detection patterns
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

// NEW: Fix specific flagged phrases with contextual replacements
async function fixSpecificFlags(text, flags) {
  if (!flags || flags.length === 0) {
    return text;
  }

  let fixedText = text;
  
  // Sort flags by position (reverse order to avoid position shifts)
  const sortedFlags = [...flags].sort((a, b) => {
    const posA = fixedText.lastIndexOf(a.phrase || '');
    const posB = fixedText.lastIndexOf(b.phrase || '');
    return posB - posA;
  });

  // Replace each flagged phrase with AI-generated contextual improvement
  for (const flag of sortedFlags) {
    if (flag.phrase && flag.suggestedFix && fixedText.includes(flag.phrase)) {
      const contextualFix = await getContextualReplacement(fixedText, flag.phrase, flag.suggestedFix);
      fixedText = fixedText.replace(flag.phrase, contextualFix);
    }
  }

  return fixedText;
}

// Get AI-powered contextual replacement that fits the sentence
async function getContextualReplacement(fullText, flaggedPhrase, baseFix) {
  try {
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const targetSentence = sentences.find(s => s.includes(flaggedPhrase));
    
    if (!targetSentence) return baseFix;

    const prompt = `You're helping fix AI detection flags. Replace the flagged phrase with a natural alternative that fits the context.

Original sentence: "${targetSentence.trim()}"
Flagged phrase: "${flaggedPhrase}"
Base replacement: "${baseFix}"

Return ONLY the replacement word/phrase that fits naturally in this specific sentence context. Keep it concise.`;

    const replacement = await callOpenAI([
      { role: "system", content: "You provide concise, natural word replacements. Respond with just the replacement phrase." },
      { role: "user", content: prompt }
    ], 0.3);

    return replacement.trim() || baseFix;
  } catch (err) {
    console.log("Contextual replacement failed:", err.message);
    return baseFix;
  }
}

async function getReliableGPTScore(text) {
  const textHash = createTextHash(text);
  
  if (scoreCache.has(textHash)) {
    return scoreCache.get(textHash);
  }

  const prompt = `You are an expert AI detection system like GPTZero and Turnitin. Analyze this text and rate its AI detection risk from 0-100%.

SCORING GUIDELINES:
- 0-25%: Natural human writing with varied sentence structure, personality, and authentic voice
- 26-45%: Mostly human but some formulaic patterns  
- 46-65%: Mixed - could be human academic writing but has AI-like patterns
- 66-85%: Strong AI patterns - formal, repetitive, generic phrasing, lacks personality
- 86-100%: Obviously AI-generated with robotic phrasing and structure

Consider these AI detection triggers:
- Overuse of formal transitions (furthermore, moreover, in conclusion)
- Corporate buzzwords (utilize, leverage, facilitate, optimize)
- Generic academic phrases (it is important to note, this underscores the significance)
- Repetitive sentence structures
- Lack of natural variation in sentence length
- Overly perfect grammar without human quirks

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
    const allPossibleFlags = generateEnhancedFlags(text);
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
  
  const flagsToReturn = availableFlags.slice(0, 6).map(flag => ({
    ...flag,
    severity: flag.weight > 12 ? 'high' : 'medium'
  }));
  
  const score = await getReliableGPTScore(text);
  
  return {
    score: Math.round(score),
    reasoning: generateScoreReasoning(score, flagsToReturn.length),
    flags: flagsToReturn,
    proTip: getScoreSpecificTip(score)
  };
}

// ENHANCED: Much more comprehensive flag detection
function generateEnhancedFlags(text) {
  const flagPatterns = [
    // Corporate Buzzwords (High Priority)
    {
      phrases: ["utilize", "utilizes", "utilizing", "utilization"],
      severity: "HIGH", weight: 16, issue: "Corporate Buzzword",
      explanation: "AI commonly uses 'utilize' instead of natural 'use'",
      suggestedFix: "use"
    },
    {
      phrases: ["leverage", "leverages", "leveraging"],
      severity: "HIGH", weight: 16, issue: "Business Jargon", 
      explanation: "Corporate buzzword that immediately flags AI writing",
      suggestedFix: "use"
    },
    {
      phrases: ["facilitate", "facilitates", "facilitating"],
      severity: "HIGH", weight: 15, issue: "Formal Language",
      explanation: "Overly formal term that sounds robotic",
      suggestedFix: "help"
    },
    {
      phrases: ["implement", "implements", "implementing", "implementation"],
      severity: "HIGH", weight: 14, issue: "Corporate Buzzword",
      explanation: "Generic business term common in AI writing",
      suggestedFix: "set up"
    },
    {
      phrases: ["optimize", "optimizes", "optimizing", "optimization"],
      severity: "HIGH", weight: 14, issue: "Corporate Language",
      explanation: "Technical buzzword that triggers AI detection",
      suggestedFix: "improve"
    },
    
    // Formal Transitions (Medium-High Priority)
    {
      phrases: ["furthermore", "moreover"],
      severity: "MEDIUM", weight: 12, issue: "Formal Transition",
      explanation: "Overly formal connector that sounds AI-generated",
      suggestedFix: "also"
    },
    {
      phrases: ["therefore", "thus", "hence"],
      severity: "MEDIUM", weight: 10, issue: "Academic Formality",
      explanation: "Common AI transition words",
      suggestedFix: "so"
    },
    {
      phrases: ["in conclusion", "to conclude"],
      severity: "MEDIUM", weight: 11, issue: "Generic Conclusion",
      explanation: "Formulaic conclusion starter used by AI",
      suggestedFix: "overall"
    },
    
    // Generic Academic Phrases (Medium Priority)  
    {
      phrases: ["it is important to note", "it should be noted"],
      severity: "MEDIUM", weight: 13, issue: "Generic Academic Phrase",
      explanation: "Formulaic academic language that screams AI",
      suggestedFix: "notably"
    },
    {
      phrases: ["plays a crucial role", "plays an important role"],
      severity: "MEDIUM", weight: 12, issue: "Generic Academic Phrase", 
      explanation: "Overused academic phrase common in AI writing",
      suggestedFix: "is important for"
    },
    {
      phrases: ["significant impact", "significant effect"],
      severity: "MEDIUM", weight: 11, issue: "Academic Cliche",
      explanation: "Generic academic phrase that flags AI writing",
      suggestedFix: "major impact"
    },
    
    // Corporate Enhancement Terms
    {
      phrases: ["enhance", "enhances", "enhancing", "enhancement"],
      severity: "MEDIUM", weight: 10, issue: "Formal Language", 
      explanation: "Formal corporate term common in AI writing",
      suggestedFix: "improve"
    },
    {
      phrases: ["demonstrate", "demonstrates", "demonstrating"],
      severity: "MEDIUM", weight: 9, issue: "Academic Formality",
      explanation: "Overly formal academic verb",
      suggestedFix: "show"
    },
    {
      phrases: ["establish", "establishes", "establishing"],
      severity: "MEDIUM", weight: 9, issue: "Formal Language",
      explanation: "Formal verb that sounds robotic",
      suggestedFix: "create"
    },
    
    // AI-Specific Patterns
    {
      phrases: ["comprehensive approach", "holistic approach"],
      severity: "MEDIUM", weight: 12, issue: "AI Buzzword Combo",
      explanation: "Buzzword combination frequently used by AI",
      suggestedFix: "complete approach"
    },
    {
      phrases: ["paramount importance", "utmost importance"],
      severity: "MEDIUM", weight: 13, issue: "Overly Dramatic",
      explanation: "Exaggerated formal language typical of AI",
      suggestedFix: "very important"
    },
    {
      phrases: ["myriad of", "plethora of"],
      severity: "MEDIUM", weight: 10, issue: "Pretentious Language",
      explanation: "Unnecessarily complex words that flag AI writing",
      suggestedFix: "many"
    },
    
    // Sentence Starters (Lower Priority but Common)
    {
      phrases: ["it is evident that", "it is clear that"],
      severity: "LOW", weight: 8, issue: "Formulaic Starter",
      explanation: "Generic sentence starter used by AI",
      suggestedFix: "clearly"
    },
    {
      phrases: ["this underscores", "this highlights"],
      severity: "LOW", weight: 8, issue: "Academic Formality", 
      explanation: "Formal academic transition",
      suggestedFix: "this shows"
    }
  ];

  const foundFlags = [];
  const textLower = text.toLowerCase();

  for (const pattern of flagPatterns) {
    for (const phrase of pattern.phrases) {
      if (textLower.includes(phrase.toLowerCase())) {
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = [...text.matchAll(regex)];
        
        if (matches.length > 0) {
          // Take the first match but note if there are multiple occurrences
          const match = matches[0];
          foundFlags.push({
            issue: pattern.issue,
            phrase: match[0],
            explanation: pattern.explanation,
            suggestedFix: pattern.suggestedFix,
            weight: pattern.weight + (matches.length > 1 ? 2 : 0), // Bonus weight for repetition
            severity: pattern.severity,
            occurrences: matches.length
          });
          break; // Only add one flag per pattern to avoid duplicates
        }
      }
    }
  }

  // Sort by weight (highest first) to prioritize most impactful fixes
  return foundFlags.sort((a, b) => b.weight - a.weight);
}

function generateScoreReasoning(score, flagCount) {
  if (score >= 70) {
    return `High AI detection risk (${score}%). Found ${flagCount} problematic patterns that will likely trigger Turnitin and GPTZero.`;
  } else if (score >= 45) {
    return `Moderate AI detection risk (${score}%). Found ${flagCount} patterns that may trigger AI detection.`;
  } else if (score >= 25) {
    return `Low-moderate AI detection risk (${score}%). ${flagCount === 0 ? 'Few red flags' : 'Minor issues'} detected.`;
  } else {
    return `Low AI detection risk (${score}%). ${flagCount === 0 ? 'No major red flags' : 'Only minor issues'} found.`;
  }
}

function getScoreSpecificTip(score) {
  if (score >= 70) {
    return "Critical: This text will likely be flagged by AI detectors. Use the fix suggestions immediately.";
  } else if (score >= 45) {
    return "Caution: Some AI detection risk. Consider fixing the highlighted issues.";
  } else if (score >= 25) {
    return "Good: Low risk, but fixing minor issues will make it even safer.";
  } else {
    return "Excellent: Text should easily pass AI detection tools.";
  }
}

async function reliableHumanize(text, targetScore = 20) {
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

GOAL: Transform this text to score UNDER 20% on AI detection tools like GPTZero and Turnitin.

KEY STRATEGIES:
1. Replace AI buzzwords: utilize→use, leverage→use, facilitate→help, implement→set up, optimize→improve
2. Vary sentence lengths dramatically (mix short punchy sentences with longer flowing ones)
3. Add natural speech patterns and hedging (seems, appears, probably, tends to)
4. Use conversational academic language, not corporate speak
5. Replace formal transitions: furthermore→also, moreover→plus, therefore→so
6. Add subtle personality and human perspective
7. Break up overly complex sentences into natural chunks
8. Use active voice where possible

AVOID:
- Corporate buzzwords and jargon
- Overly formal academic phrases ("it is important to note", "plays a crucial role")  
- Generic conclusions ("in conclusion", "to summarize")
- Repetitive sentence structures
- Perfect formal grammar (add natural variation)

Keep it academically appropriate but make it sound like a real person wrote it, not a robot.`;

  const userPrompt = `Transform this text to sound human and natural (target: under 20% AI detection):

"${escapeQuotes(text)}"

Return ONLY the rewritten text.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], aggressive ? 0.8 : 0.6);

  return result.trim();
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
      max_tokens: 1000
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
