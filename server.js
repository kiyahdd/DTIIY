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
  const systemPrompt = `You are a strict AI detector that identifies text patterns typical of AI generation. Focus on catching formal language that sounds robotic rather than naturally written.

Return STRICT JSON with these exact keys:
- score (0-100 integer, where higher = more AI-like)
- reasoning (2-3 sentences explaining the score)  
- flags (array of objects with: issue, phrase, explanation, suggestedFix)
- proTip (one helpful sentence)

Score HIGH (60-85) for:
- Corporate buzzwords (utilize, leverage, optimize, facilitate, implement)
- Overly formal transitions (furthermore, however, therefore, in conclusion)
- Perfect grammar with zero contractions
- Repetitive sentence structures
- Generic academic language without personality
- Robotic flow and phrasing

Score MEDIUM (35-59) for:
- Some formal language but with natural elements
- Mix of contractions and formal tone
- Decent variety but some stiff patterns

Score LOW (0-34) for:
- Natural use of contractions
- Conversational academic tone
- Varied sentence structures
- Personal voice coming through
- Flows naturally

For flags, provide exact 1-4 word phrases that can be replaced with more natural alternatives.`;

  const userPrompt = `Analyze this text for AI-like patterns. Focus on overly formal language that sounds robotic:

Text: "${escapeQuotes(text)}"

Look for:
- Corporate buzzwords that need casual replacements
- Lack of natural contractions
- Overly perfect/formal grammar
- Repetitive sentence patterns
- Generic academic language

Provide exact short phrases to replace.`;

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
      reasoning: "Could not parse AI response. Text likely contains formal patterns typical of AI generation.",
      flags: [{
        issue: "Analysis Error", 
        phrase: "analysis failed",
        explanation: "Technical issue occurred during analysis.",
        suggestedFix: "couldn't check this"
      }],
      proTip: "Try using more natural language and contractions."
    };
  }

  // Sanitize response
  parsed.score = Math.max(0, Math.min(100, parseInt(parsed.score) || 60));
  if (!Array.isArray(parsed.flags)) parsed.flags = [];
  
  // Filter flags for actual replaceable phrases
  parsed.flags = parsed.flags.filter(flag => {
    const phrase = (flag.phrase || '').trim();
    const fix = (flag.suggestedFix || '').trim();
    
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
           !fix.toLowerCase().includes('should');
  });
  
  if (!parsed.reasoning) parsed.reasoning = "Analysis completed - found typical AI writing patterns.";
  if (!parsed.proTip) parsed.proTip = "Use more natural language and contractions to sound human.";
  
  return parsed;
}

async function humanizeWithOpenAI(text) {
  const systemPrompt = `You are an expert at rewriting AI-generated text to sound like genuine student writing that will score UNDER 30% on AI detectors while remaining academically appropriate.

CRITICAL MISSION: Transform this text to score under 30% on AI detectors while keeping it suitable for academic submission.

REQUIRED CHANGES:
- Add natural contractions where appropriate (it's, don't, won't, can't, we're, they've)
- Replace formal/corporate words with natural academic language
- Vary sentence lengths dramatically (mix short, medium, and longer sentences)
- Add subtle natural flow words (also, plus, but, so, and, though)
- Use more conversational academic tone
- Include some natural hesitation/qualification (seems like, appears to, tends to)
- Break perfect grammar patterns with natural variations
- Remove overly formal transitions
- Make it sound like a smart student wrote it naturally, not AI

KEY REPLACEMENTS:
- utilize → use
- leverage → use/take advantage of  
- facilitate → help/enable
- implement → set up/establish
- optimize → improve
- enhance → improve/strengthen
- furthermore → also/additionally  
- however → but/though
- therefore → so/thus
- in conclusion → overall/in the end
- significant → important/major
- comprehensive → thorough/complete

TARGET: Sound like natural student writing - academic but conversational, not robotic or overly formal.`;
  
  const userPrompt = `Rewrite this to sound like genuine student writing that will score UNDER 30% on AI detectors. Keep it academic but natural:

"${escapeQuotes(text)}"

Requirements:
- Use contractions naturally
- Replace corporate buzzwords with normal words
- Vary sentence structures  
- Sound like a real student wrote it
- Keep academic tone but make it conversational
- Remove AI-like formal patterns

Return ONLY the rewritten text.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 0.7); // Balanced creativity

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
