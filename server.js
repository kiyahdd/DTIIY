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

// Main analyze endpoint
app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze" } = req.body || {};
    
    if (!essay || typeof essay !== "string" || essay.trim().length < 50 || essay.length > 500) {
      return res.status(200).json({ 
        error: true, 
        message: "Text must be 50–500 characters." 
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(200).json({ 
        error: true, 
        message: "Server missing OpenAI key." 
      });
    }

    if (action === "humanize") {
      const humanizedText = await humanizeWithOpenAI(essay);
      return res.status(200).json({ humanizedText });
    }

    // Main analysis
    const analysis = await analyzeWithOpenAI(essay);
    
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

// ---------- OpenAI Helper Functions ----------

async function analyzeWithOpenAI(text) {
  const systemPrompt = `You are an AI detector that identifies text that sounds artificial or generated. Your job is to be STRICT and catch AI-like patterns that would trigger detection tools.

Return STRICT JSON with these exact keys:
- score (0-100 integer, where higher = more AI-like)
- reasoning (2-3 sentences explaining the score)  
- flags (array of objects with: issue, phrase, explanation, suggestedFix)
- proTip (one helpful sentence)

For flags, ONLY include specific words/phrases from the text that can be directly replaced with better alternatives. The "phrase" should be actual text from the input, and "suggestedFix" should be a single word or short phrase replacement.

Score HIGH (60-85) for:
- Corporate buzzwords (utilize, leverage, optimize, facilitate, implement, etc.)
- Formal transitions (furthermore, however, therefore, in conclusion)
- Perfect grammar with no contractions
- Repetitive sentence structures
- Overly academic language
- Generic statements without personality

Keep JSON valid. No extra text outside the JSON.`;

  const userPrompt = `Analyze this text for AI-like characteristics. Focus on specific replaceable words/phrases that make it sound robotic:

Text: "${escapeQuotes(text)}"

For each flag, provide:
1. The exact phrase from the text (must be 1-4 words)
2. A natural, casual replacement that fits the context
3. Clear explanation why the original sounds AI-generated

Be strict - most AI-generated text should score 50+ unless it's genuinely casual and human-like.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);

  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch (parseError) {
    console.error("JSON parse failed:", parseError);
    parsed = {
      score: 65,
      reasoning: "Could not parse AI response. Using fallback analysis based on detected patterns.",
      flags: [{
        issue: "Analysis Error", 
        phrase: "analysis failed",
        explanation: "Technical issue occurred during analysis.",
        suggestedFix: "couldn't analyze this"
      }],
      proTip: "Try rewriting in a more casual, conversational tone."
    };
  }

  // Sanitize response
  parsed.score = Math.max(0, Math.min(100, parseInt(parsed.score) || 60));
  if (!Array.isArray(parsed.flags)) parsed.flags = [];
  
  // Filter out flags that aren't actual single word/phrase replacements
  parsed.flags = parsed.flags.filter(flag => {
    const phrase = (flag.phrase || '').trim();
    const fix = (flag.suggestedFix || '').trim();
    
    // Must be short, replaceable phrases
    return phrase.length > 0 && 
           phrase.length < 50 &&
           phrase.split(' ').length <= 4 &&
           fix.length > 0 && 
           fix.length < 50 &&
           fix.split(' ').length <= 4 &&
           phrase !== 'N/A' && 
           fix !== '—' &&
           !fix.toLowerCase().includes('try') &&
           !fix.toLowerCase().includes('consider') &&
           !fix.toLowerCase().includes('should') &&
           !fix.toLowerCase().includes('make sure');
  });
  
  if (!parsed.reasoning) parsed.reasoning = "Analysis completed with standard AI detection patterns.";
  if (!parsed.proTip) parsed.proTip = "Write like you're talking to a friend - casual and natural!";
  
  return parsed;
}

async function humanizeWithOpenAI(text) {
  const systemPrompt = `You are an expert at rewriting AI-generated text to sound completely human and pass AI detection tools with a score UNDER 30%.

CRITICAL MISSION: Transform this text so dramatically that it will score under 30% on AI detectors while keeping the core meaning intact.

REQUIRED CHANGES:
- Replace ALL formal words with casual alternatives (utilize → use, facilitate → help, implement → set up)
- Add contractions everywhere possible (it is → it's, do not → don't, will not → won't)
- Mix sentence lengths dramatically (short, medium, long)
- Add filler words and natural speech patterns (like, you know, basically, pretty much)
- Use informal transitions (but, so, and, plus, also instead of however, furthermore, therefore)
- Add personal touches and casual expressions
- Break some grammar rules naturally (end sentences with prepositions, use sentence fragments)
- Include casual interjections and natural flow
- Make it sound like someone actually talking, not writing formally

TARGET: The rewrite should be at LEAST 70% different in style and word choice while maintaining the same core message.

NEVER keep formal academic language. NEVER use corporate buzzwords. Make it sound like a real person wrote it naturally.`;
  
  const userPrompt = `Transform this text to sound genuinely human-written and score under 30% on AI detectors. Make it casual, natural, and completely different in style:

"${escapeQuotes(text)}"

Requirements:
- Use contractions extensively 
- Replace formal words with casual ones
- Vary sentence lengths dramatically
- Add natural filler words
- Sound conversational, not academic
- Break traditional writing rules naturally
- Make it sound like real human speech

Return ONLY the rewritten text with no explanations.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 0.8); // Higher temperature for more creativity

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
