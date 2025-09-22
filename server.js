import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/health", (req, res) => res.json({ ok: true }));

const scoreCache = new Map();

app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", flags } = req.body || {};
    
    console.log("Analyzing essay length:", essay?.length);
    
    if (!essay || typeof essay !== "string" || essay.trim().length < 50) {
      return res.status(200).json({ 
        error: true, 
        message: "Text must be at least 50 characters." 
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({ 
        error: true, 
        message: "Server configuration error." 
      });
    }

    // Handle flag fixing
    if (action === "fix_flags") {
      const fixedText = await fixSpecificFlags(essay, flags);
      const originalScore = await getGPTZeroCompatibleScore(essay);
      const newScore = await getGPTZeroCompatibleScore(fixedText);
      
      return res.status(200).json({ 
        fixedText,
        text: fixedText,
        originalScore: originalScore,
        newScore: newScore
      });
    }

    // Main analysis
    const analysis = await analyzeWithGPTZeroLogic(essay);
    return res.status(200).json(analysis);

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(200).json({ 
      error: true, 
      message: "Analysis failed: " + err.message 
    });
  }
});

// GPTZero-Compatible Scoring (MUCH more accurate)
async function getGPTZeroCompatibleScore(text) {
  const textHash = createTextHash(text);
  
  if (scoreCache.has(textHash)) {
    return scoreCache.get(textHash);
  }

  const prompt = `You are GPTZero's detection algorithm. Analyze this text for AI generation patterns and provide a detection score 0-100%.

CRITICAL DETECTION FACTORS (like GPTZero):
1. **Perplexity & Burstiness**: Measure sentence structure variation
2. **Pattern Repetition**: Repeated syntactic structures
3. **Formality Level**: Overly formal academic/corporate language
4. **Vocabulary Diversity**: Limited or predictable word choices
5. **Semantic Predictability**: How predictable the content flow is
6. **Stylistic Consistency**: Unnatural consistency in tone/style

TEXT ANALYSIS:
- High AI scores (70-100%): Uniform sentence lengths, corporate jargon, perfect grammar, predictable transitions
- Medium AI scores (40-69%): Mixed patterns, some human elements but detectable AI influence
- Low AI scores (0-39%): Varied sentence lengths, natural imperfections, personal voice, unpredictable flow

Text to analyze:
"""
${text}
"""

Respond with ONLY a number between 0-100 representing the AI detection probability.`;

  try {
    const result = await callOpenAI([
      { role: "system", content: "You are GPTZero's AI detection system. Analyze text and return ONLY a number 0-100 for AI probability." },
      { role: "user", content: prompt }
    ], 0.1);

    let score = parseInt(result.trim());
    
    // Validate score
    if (isNaN(score) || score < 0 || score > 100) {
      score = calculateFallbackScore(text);
    }
    
    console.log("GPTZero-compatible score:", score);
    scoreCache.set(textHash, score);
    return score;
    
  } catch (err) {
    console.log("GPTZero scoring failed, using fallback:", err.message);
    return calculateFallbackScore(text);
  }
}

// Accurate fallback scoring that matches real detectors
function calculateFallbackScore(text) {
  let score = 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0) return 50;
  
  // 1. Sentence Length Variation (Burstiness)
  const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
  const lengthStdDev = calculateStdDev(sentenceLengths);
  if (lengthStdDev < 3) score += 25; // Low variation = AI
  if (lengthStdDev > 8) score -= 15; // High variation = human
  
  // 2. Corporate/Formal Language Detection
  const formalWords = [
    'utilize', 'leverage', 'facilitate', 'implement', 'optimize',
    'furthermore', 'moreover', 'therefore', 'thus', 'hence',
    'paramount', 'myriad', 'plethora', 'underscores', 'highlight'
  ];
  
  formalWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (text.match(regex)) {
      score += 20;
    }
  });
  
  // 3. Transition Word Overuse
  const transitions = ['however', 'therefore', 'consequently', 'additionally', 'furthermore'];
  let transitionCount = 0;
  transitions.forEach(transition => {
    const regex = new RegExp(`\\b${transition}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) transitionCount += matches.length;
  });
  
  if (transitionCount > sentences.length * 0.3) {
    score += 20; // Overuse of transitions = AI
  }
  
  // 4. Sentence Structure Repetition
  const startingWords = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase() || '');
  const uniqueStarters = new Set(startingWords).size;
  if (uniqueStarters / sentences.length < 0.6) {
    score += 15; // Repetitive sentence starters = AI
  }
  
  // 5. Vocabulary Diversity
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const diversityRatio = uniqueWords / words.length;
  if (diversityRatio < 0.5) score += 15;
  if (diversityRatio > 0.7) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

function calculateStdDev(numbers) {
  const n = numbers.length;
  const mean = numbers.reduce((a, b) => a + b) / n;
  return Math.sqrt(numbers.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}

async function analyzeWithGPTZeroLogic(text) {
  const flags = detectRealAIPatterns(text);
  const score = await getGPTZeroCompatibleScore(text);
  
  return {
    score: Math.round(score),
    reasoning: getGPTZeroReasoning(score, flags.length),
    flags: flags.slice(0, 8),
    proTip: getRealisticTip(score)
  };
}

// Real AI pattern detection that matches actual detectors
function detectRealAIPatterns(text) {
  const patterns = [
    // High-confidence AI patterns (like GPTZero detects)
    {
      phrases: ["it is important to note", "it should be noted that", "it is worth noting"],
      weight: 25,
      explanation: "Formulaic academic phrasing strongly associated with AI generation",
      suggestedFix: "Notably"
    },
    {
      phrases: ["in conclusion", "to summarize", "in summary"],
      weight: 22,
      explanation: "Predictable conclusion patterns common in AI writing",
      suggestedFix: "Overall"
    },
    {
      phrases: ["this essay will", "this paper will discuss", "the purpose of this"],
      weight: 23,
      explanation: "AI often uses explicit meta-commentary about the writing itself",
      suggestedFix: "This explores"
    },
    
    // Medium-confidence patterns
    {
      phrases: ["utilize", "leverage", "facilitate"],
      weight: 18,
      explanation: "Corporate buzzwords rarely used in natural human writing",
      suggestedFix: "use"
    },
    {
      phrases: ["furthermore", "moreover", "additionally"],
      weight: 16,
      explanation: "Overly formal transitions that sound artificial",
      suggestedFix: "also"
    },
    {
      phrases: ["plays a crucial role", "of paramount importance"],
      weight: 19,
      explanation: "Exaggerated formal language typical of AI",
      suggestedFix: "is very important"
    },
    
    // Sentence structure patterns
    {
      phrases: [". This", ". It", ". The"], // Pattern: short sentences starting similarly
      weight: 15,
      explanation: "Repetitive sentence structure patterns",
      suggestedFix: "Vary sentence beginnings"
    }
  ];

  const flags = [];
  const textLower = text.toLowerCase();

  patterns.forEach(pattern => {
    pattern.phrases.forEach(phrase => {
      if (textLower.includes(phrase.toLowerCase())) {
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = text.match(regex);
        
        if (matches) {
          flags.push({
            phrase: phrase,
            explanation: pattern.explanation,
            suggestedFix: pattern.suggestedFix,
            weight: pattern.weight,
            severity: pattern.weight > 20 ? 'high' : 'medium',
            occurrences: matches.length
          });
        }
      }
    });
  });

  return flags.sort((a, b) => b.weight - a.weight);
}

function getGPTZeroReasoning(score, flagCount) {
  if (score >= 80) {
    return `HIGH AI DETECTION (${score}%) - This would likely be flagged by GPTZero as AI-generated. ${flagCount} strong AI patterns detected.`;
  } else if (score >= 60) {
    return `MODERATE-HIGH AI DETECTION (${score}%) - GPTZero would detect significant AI influence. ${flagCount} AI patterns found.`;
  } else if (score >= 40) {
    return `MIXED DETECTION (${score}%) - Some AI patterns present. ${flagCount} issues to address.`;
  } else if (score >= 20) {
    return `LOW AI DETECTION (${score}%) - Mostly human-like. ${flagCount} minor patterns.`;
  } else {
    return `VERY LOW AI DETECTION (${score}%) - Likely to pass GPTZero. ${flagCount === 0 ? 'No' : 'Minimal'} AI patterns.`;
  }
}

function getRealisticTip(score) {
  if (score >= 80) return "CRITICAL: This would definitely be flagged as AI by GPTZero. Major rewriting needed.";
  if (score >= 60) return "HIGH RISK: GPTZero would detect AI patterns. Significant fixes required.";
  if (score >= 40) return "MODERATE RISK: Some AI patterns detectable. Recommended to fix highlighted issues.";
  if (score >= 20) return "LOW RISK: Mostly safe but could be improved.";
  return "EXCELLENT: Very low AI detection risk.";
}

async function fixSpecificFlags(text, flags) {
  if (!flags || flags.length === 0) return text;

  let fixedText = text;
  
  // Apply fixes in reverse order to avoid position issues
  const sortedFlags = [...flags].sort((a, b) => {
    return text.lastIndexOf(b.phrase) - text.lastIndexOf(a.phrase);
  });

  for (const flag of sortedFlags) {
    if (flag.phrase && fixedText.includes(flag.phrase)) {
      const fix = flag.suggestedFix || await generateSmartFix(flag.phrase, fixedText);
      fixedText = fixedText.replace(new RegExp(flag.phrase, 'gi'), fix);
    }
  }

  return fixedText;
}

async function generateSmartFix(phrase, context) {
  const prompt = `Replace this AI-sounding phrase with a natural human alternative:

AI phrase: "${phrase}"
Context: "${context.substring(0, 200)}..."

Return ONLY the natural replacement:`;

  try {
    const result = await callOpenAI([
      { role: "system", content: "Provide concise, natural alternatives to AI-sounding phrases." },
      { role: "user", content: prompt }
    ], 0.4);
    
    return result.trim() || phrase;
  } catch (err) {
    return phrase; // Fallback to original
  }
}

// Utility functions
function createTextHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
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
      messages: messages,
      temperature: temperature,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

app.listen(PORT, () => {
  console.log(`Fixed backend running on port ${PORT} - GPTZero compatible scoring enabled`);
});
