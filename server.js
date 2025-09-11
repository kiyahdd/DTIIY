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
  const systemPrompt = `You are an expert at rewriting AI-generated text to sound completely human and score UNDER 25% on ANY AI detector while remaining academically appropriate.

ULTRA-CRITICAL MISSION: Transform this text so aggressively that it WILL score under 25% on AI detectors.

MANDATORY REQUIREMENTS (DO ALL OF THESE):
1. Use contractions EVERYWHERE possible (it's, don't, won't, can't, we're, they've, you're, I'm, there's, here's)
2. Replace ALL formal words with casual academic equivalents
3. Add natural hedging words (kind of, sort of, seems like, appears to, tends to, probably)
4. Mix sentence lengths DRAMATICALLY (very short. Medium ones. And really long complex sentences that flow naturally)
5. Use conversational connectors (but, so, and, plus, also, though, since)
6. Add subtle personality (I think, in my opinion, it feels like, personally)
7. Break some formal grammar rules naturally
8. Remove ALL corporate buzzwords completely
9. Make it sound like casual academic conversation, not formal writing

AGGRESSIVE REPLACEMENTS (USE ALL):
- utilize/utilizes → use/uses
- leverage → use/take advantage of
- facilitate → help/make easier
- implement → set up/put in place
- optimize → improve/make better
- enhance → strengthen/improve
- furthermore → also/plus/and
- however → but/though
- therefore → so/that's why
- in conclusion → overall/basically/in the end
- significant → important/big/major
- comprehensive → complete/thorough
- substantial → major/big
- establish → set up/create
- demonstrate → show
- indicate → suggest/show
- various → different/many
- numerous → many/lots of
- acquire → get/gain
- maintain → keep
- conduct → do/carry out
- obtain → get

TARGET: Must sound like a smart but casual student wrote it naturally. Think conversational academic writing, NOT formal essay style.`;
  
  const userPrompt = `Rewrite this to score UNDER 25% on AI detectors. Be VERY aggressive with casual language while keeping it academic:

"${escapeQuotes(text)}"

MUST include:
- Heavy use of contractions throughout
- Casual academic language (no corporate words)
- Natural flow and personality
- Varied sentence structures
- Conversational tone
- Natural hedging/qualification words

Make it sound like actual student writing, not AI. Return ONLY the rewritten text.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], 0.8); // Higher creativity for more human variation

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

