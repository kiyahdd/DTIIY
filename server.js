// server.js - UPDATED FOR FRONTEND INTEGRATION
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/health", (req, res) => res.json({ ok: true }));

// In-memory storage (replace with DB for production)
const userUsage = new Map(); // userId-date -> { scans: number }

// ================== USAGE TRACKING ==================
function todayKey(userId) {
  return `${userId || "anon"}-${new Date().toDateString()}`;
}

function getUsage(userId) {
  const key = todayKey(userId);
  if (!userUsage.has(key)) userUsage.set(key, { scans: 0 });
  return userUsage.get(key);
}

function incrementScans(userId) {
  const usage = getUsage(userId);
  usage.scans++;
  return usage.scans;
}

function canScan(userId) {
  const usage = getUsage(userId);
  return usage.scans < 3; // 3 free scans per day
}

// ================== PATTERN DETECTION (AGGRESSIVE FOR CONVERSIONS) ==================
function detectFlags(text) {
  const patterns = [
    // CRITICAL FLAGS - These create maximum urgency
    { rx: /\butili[sz]e(?:d|s|ing|ation)?\b/gi, weight: 40, exp: "AI LOVES 'utilize' instead of 'use' - major red flag", fix: "use", severity: "critical" },
    { rx: /\bleverage(?:d|s|ing)?\b/gi, weight: 38, exp: "Corporate buzzword = instant AI detection", fix: "use", severity: "critical" },
    { rx: /\bfurthermore\b/gi, weight: 35, exp: "Classic AI transition word - dead giveaway", fix: "also", severity: "critical" },
    { rx: /\bmoreover\b/gi, weight: 35, exp: "Another AI favorite transition", fix: "plus", severity: "critical" },
    { rx: /\bit is (important|crucial|essential) to note\b/gi, weight: 42, exp: "Formulaic AI phrase - professors know this one", fix: "notably", severity: "critical" },
    
    // HIGH PRIORITY FLAGS
    { rx: /\bimplement(?:ed|s|ing|ation)?\b/gi, weight: 28, exp: "Business jargon that screams AI", fix: "set up", severity: "high" },
    { rx: /\boptimi[sz]e(?:d|s|ing|ation)?\b/gi, weight: 27, exp: "Tech buzzword - major detector trigger", fix: "improve", severity: "high" },
    { rx: /\bfacilitat(?:e|es|ed|ing|ion)\b/gi, weight: 25, exp: "Formal corporate speak", fix: "help", severity: "high" },
    { rx: /\benhance(?:d|s|ing|ment)?\b/gi, weight: 24, exp: "Overused AI verb choice", fix: "improve", severity: "high" },
    
    // MEDIUM FLAGS
    { rx: /\btherefore\b/gi, weight: 20, exp: "Academic connector - sounds robotic", fix: "so", severity: "medium" },
    { rx: /\badditionally\b/gi, weight: 19, exp: "Formal transition word", fix: "also", severity: "medium" },
    { rx: /\bconsequently\b/gi, weight: 18, exp: "Academic language pattern", fix: "so", severity: "medium" },
    { rx: /\bin conclusion\b/gi, weight: 22, exp: "Generic AI ending phrase", fix: "overall", severity: "medium" },
    { rx: /\bcomprehensive\b/gi, weight: 17, exp: "Overused AI adjective", fix: "complete", severity: "medium" },
    
    // LOWER FLAGS (still important for total score)
    { rx: /\bdemonstrate(?:s|d)?\b/gi, weight: 14, exp: "Academic verb choice", fix: "show", severity: "medium" },
    { rx: /\bestablish(?:ed|ing|es)?\b/gi, weight: 13, exp: "Formal language pattern", fix: "set up", severity: "medium" },
    { rx: /\bsignificant(?:ly)?\b/gi, weight: 12, exp: "Overused academic word", fix: "big", severity: "medium" },
    { rx: /\bsubstantial(?:ly)?\b/gi, weight: 11, exp: "Formal descriptor", fix: "large", severity: "medium" }
  ];

  const flags = [];
  
  for (const p of patterns) {
    const matches = [...text.matchAll(p.rx)];
    if (matches.length > 0) {
      flags.push({
        phrase: matches[0][0],
        explanation: p.exp,
        suggestedFix: p.fix,
        weight: p.weight,
        severity: p.severity,
        occurrences: matches.length,
        impact: p.weight * matches.length
      });
    }
  }
  
  return flags.sort((a, b) => b.impact - a.impact);
}

// ================== SMART SCORING ALGORITHM ==================
function calculateScore(text, flags) {
  let baseScore = 20; // Start with human baseline
  
  // Add points for each flag based on weight and frequency
  for (const flag of flags) {
    baseScore += flag.impact * 0.8; // Each flag adds significant points
  }
  
  // Text analysis adjustments
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Short texts seem more AI-like (less human variation)
  if (words < 100) baseScore += 15;
  
  // Check sentence uniformity (AI tends to write uniform sentences)
  if (sentences.length > 2) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    if (variance < 9) baseScore += 20; // Low variance = robotic
    if (avgLength > 25) baseScore += 15; // Very long sentences
  }
  
  // Check for lack of contractions (too formal)
  const contractions = (text.match(/\b\w+[''](?:t|re|ll|ve|d|s|m)\b/gi) || []).length;
  const contractionRate = contractions / Math.max(words, 1);
  if (contractionRate < 0.02) baseScore += 18; // No contractions = formal AI style
  
  // Passive voice check (AI loves passive voice)
  const passiveIndicators = (text.match(/\b(?:was|were|been|being)\s+\w+ed\b/gi) || []).length;
  if (passiveIndicators / sentences.length > 0.3) baseScore += 12;
  
  // Ensure critical flags create minimum scary scores
  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const minScoreFromFlags = Math.min(85, 45 + (criticalCount * 15));
  
  const finalScore = Math.max(baseScore, minScoreFromFlags);
  return Math.max(5, Math.min(95, Math.round(finalScore)));
}

// ================== MAIN API ENDPOINT ==================
app.post("/analyze", async (req, res) => {
  try {
    const { essay, action = "analyze", userId = 'anonymous' } = req.body || {};

    if (!essay || essay.trim().length < 50 || essay.length > 500) {
      return res.status(200).json({ 
        error: true, 
        message: "Text must be 50-500 characters for free tier."
      });
    }

    const text = essay.trim();

    // Check daily limits for free users
    if (!canScan(userId)) {
      return res.status(200).json({
        error: true,
        message: "Daily limit reached (3 scans). Upgrade to Pro for 10 daily scans!",
        upgradeRequired: true
      });
    }

    // Handle fix request (only show upgrade prompt for free users)
    if (action === "fix_flags") {
      return res.status(200).json({
        error: true,
        message: "Fixing requires Pro subscription. Upgrade for instant fixes!",
        upgradeRequired: true
      });
    }

    // Main analysis
    const detectedFlags = detectFlags(text);
    const score = calculateScore(text, detectedFlags);
    
    // Increment usage
    const scansUsed = incrementScans(userId);
    const scansLeft = Math.max(0, 3 - scansUsed);
    
    return res.status(200).json({
      score,
      flags: detectedFlags.slice(0, 15), // Show up to 15 flags
      scansLeft,
      upgradeRequired: scansLeft === 0
    });

  } catch (err) {
    console.error("Analysis error:", err);
    return res.status(200).json({ 
      error: true, 
      message: "Analysis failed: " + err.message 
    });
  }
});

// ================== HELPER FUNCTIONS ==================
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.listen(PORT, () => {
  console.log(`False Flag Fixer (Free Version) running on port ${PORT}`);
});
