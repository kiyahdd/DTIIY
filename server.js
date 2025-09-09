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
  const systemPrompt = `You are an AI detector that identifies text that sounds artificial or generated. Return STRICT JSON with these exact keys:
- score (0-100 integer, where higher = more AI-like)
- reasoning (2-3 sentences explaining the score)  
- flags (array of objects with: issue, phrase, explanation, suggestedFix)
- proTip (one helpful sentence)

IMPORTANT: For flags, only include specific words/phrases that can be directly replaced, not general suggestions. The "phrase" should be actual text from the input, and "suggestedFix" should be a direct replacement that makes sense in context.

Keep JSON valid. No extra text outside the JSON.`;

  const userPrompt = `Analyze this text for AI-like characteristics. Focus on specific replaceable words/phrases:
- Formal/corporate language (utilize, leverage, optimize, facilitate, etc.)
- Stiff sentence structures  
- Generic buzzwords
- Overly perfect grammar
- Repetitive patterns
- Academic formality

Text: "${escapeQuotes(text)}"

For each flag, provide the exact phrase from the text and a natural replacement that fits the context.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);

  let parsed;
  try {
    parsed = JSON.parse(result);
  } catch (parseError) {
    console.error("JSON parse failed:", parseError);
    // Safe fallback response
    parsed = {
      score: 55,
      reasoning: "Could not parse AI response. Using fallback analysis.",
      flags: [{
        issue: "Analysis Error", 
        phrase: "N/A",
        explanation: "Technical issue occurred during analysis.",
        suggestedFix: "Try again or vary your writing style."
      }],
      proTip: "Vary sentence lengths and add personal details to make writing more human."
    };
  }

  // Sanitize response - ensure flags contain actual replaceable content
  parsed.score = Math.max(0, Math.min(100, parseInt(parsed.score) || 50));
  if (!Array.isArray(parsed.flags)) parsed.flags = [];
  
  // Filter out flags that aren't actual replaceable phrases
  parsed.flags = parsed.flags.filter(flag => {
    const phrase = flag.phrase || '';
    const fix = flag.suggestedFix || '';
    
    // Must be actual phrases from the text, not suggestions
    return phrase !== 'N/A' && 
           fix !== '—' &&
           phrase.length > 0 &&
           fix.length > 0 &&
           !fix.toLowerCase().includes('try') &&
           !fix.toLowerCase().includes('consider') &&
           !fix.toLowerCase().includes('make sure') &&
           !fix.toLowerCase().includes('should');
  });
  
  if (!parsed.reasoning) parsed.reasoning = "Analysis completed.";
  if (!parsed.proTip) parsed.proTip = "Keep writing naturally!";
  
  return parsed;
}

async function humanizeWithOpenAI(text) {
  const systemPrompt = `You are an expert at making AI-generated text sound completely human and natural. Your goal is to DRAMATICALLY transform the writing style while keeping the core message intact.

CRITICAL REQUIREMENTS:
- Make writing sound like a real student wrote it naturally
- Remove ALL corporate buzzwords and formal language  
- Use casual, conversational tone
- Add personal touches and natural speech patterns
- Mix up sentence structures significantly
- Include contractions, informal language, and natural flow
- Make it at LEAST 40% different from the original in style and word choice
- Keep the same meaning but change HOW it's expressed

Transform stiff, formal writing into authentic human voice.`;
  
  const userPrompt = `Transform this text to sound genuinely human-written. Make it casual, natural, and significantly different in style:

"${escapeQuotes(text)}"

Return ONLY the rewritten text with no explanations.`;

  const result = await callOpenAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]);

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
}status(200).json({ 
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
    
    return res.
