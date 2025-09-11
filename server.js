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
    const { essay, action = "analyze", style, instructions } = req.body || {};
    
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

    // Handle academic humanization specifically
    if (action === "humanize_academic" || action === "bypass_ai_detection") {
      const humanizedText = await humanizeWithOpenAI(essay);
      return res.status(200).json({ humanizedText });
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

// Global tracking of suggested phrases to prevent re-flagging
let suggestedPhrases = new Set();

async function analyzeWithOpenAI(text) {
  const systemPrompt = `You are a highly sensitive AI detector that identifies even subtle AI-generated patterns in academic writing.

Return STRICT JSON with these exact keys:
- score (0-100 integer, where higher = more AI-like)
- reasoning (2-3 sentences explaining the score)  
- flags (array of objects with: issue, phrase, explanation, suggestedFix)
- proTip (one helpful sentence)

SCORING GUIDELINES:
- Score 80-90 for heavy corporate buzzwords and perfect formal structure
- Score 60-79 for noticeable formal patterns but some natural elements  
- Score 40-59 for mixed formal/casual with some contractions
- Score 20-39 for mostly natural academic writing with good flow
- Score 0-19 for genuinely human-sounding academic prose

BE SENSITIVE to changes - even small improvements should lower the score noticeably.

Flag these AI patterns:
- Corporate buzzwords: utilize, leverage, optimize, facilitate, implement, enhance
- Overly formal transitions: furthermore, however, therefore, moreover, in conclusion
- Perfect parallel structure without variation
- Lack of contractions where natural
- Generic academic phrases: comprehensive solutions, cutting-edge technologies, unprecedented levels

For suggestedFix, provide ACADEMIC-APPROPRIATE but more natural alternatives:
- utilize → use/employ
- leverage → use/apply  
- cutting-edge technologies → advanced tools/modern technology
- comprehensive solutions → thorough approaches/complete methods
- facilitate → enable/support
- optimize → improve/enhance
- implement → establish/introduce
- furthermore → additionally/also
- however → but/though/yet
- therefore → thus/so/consequently

Keep suggestions academic but more conversational.`;

  const userPrompt = `Analyze this text for AI patterns. Be sensitive to improvements - if text has been made more natural, reflect that in a lower score:

Text: "${escapeQuotes(text)}"

Look for formal patterns but suggest academic-appropriate alternatives, not overly casual language.`;

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
      reasoning: "Could not parse AI response.",
      flags: [],
      proTip: "Try using more natural academic language."
    };
  }

  // Sanitize response
  parsed.score = Math.max(0, Math.min(100, parseInt(parsed.score) || 60));
  if (!Array.isArray(parsed.flags)) parsed.flags = [];
  
  // Filter out flags for phrases we previously suggested
  parsed.flags = parsed.flags.filter(flag => {
    const phrase = (flag.phrase || '').trim().toLowerCase();
    
    // Don't flag anything we previously suggested
    const wasPreviouslySuggested = Array.from(suggestedPhrases).some(suggested => 
      phrase.includes(suggested.toLowerCase()) || suggested.toLowerCase().includes(phrase)
    );
    
    return !wasPreviouslySuggested && 
           phrase.length > 0 && 
           phrase.length < 50 &&
           phrase !== 'n/a';
  });
  
  // Track new suggestions to prevent future flagging
  parsed.flags.forEach(flag => {
    if (flag.suggestedFix && flag.suggestedFix !== '—') {
      suggestedPhrases.add(flag.suggestedFix.trim().toLowerCase());
    }
  });
  
  if (!parsed.reasoning) parsed.reasoning = "Analysis completed.";
  if (!parsed.proTip) parsed.proTip = "Use more natural academic language with appropriate contractions.";
  
  return parsed;
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
  ], 0.9); // Maximum creativity for human variation

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
