// server.js - Final Updated Version for False Flag Fixer 🛠️
import express from "express";
import cors from "cors";

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

// ================== IN-MEMORY STORAGE ==================
const userUsage = new Map(); // key = userId -> { scansUsed: int, emergencyUsed: bool, pro: bool }

function getUserState(userId = "anon") {
  if (!userUsage.has(userId)) {
    userUsage.set(userId, { scansUsed: 0, emergencyUsed: false, pro: false });
  }
  return userUsage.get(userId);
}

function canScan(userId) {
  const user = getUserState(userId);
  if (user.pro) return true; // Pro always allowed
  return user.scansUsed < 3; // Free: 3 scans/day
}

function incrementScan(userId) {
  const user = getUserState(userId);
  user.scansUsed++;
}

function useEmergency(userId) {
  const user = getUserState(userId);
  user.emergencyUsed = true;
}

function upgradeToPro(userId) {
  const user = getUserState(userId);
  user.pro = true;
}

// ================== FLAG DETECTION ==================
const patterns = [
  { rx: /\butili[sz]e(?:d|s|ing|ation)?\b/gi, weight: 40, exp: "AI LOVES 'utilize' instead of 'use' - major red flag", fix: "use", severity: "critical" },
  { rx: /\bleverage(?:d|s|ing)?\b/gi, weight: 38, exp: "Corporate buzzword = instant AI detection", fix: "use", severity: "critical" },
  { rx: /\bfurthermore\b/gi, weight: 35, exp: "Classic AI transition word - dead giveaway", fix: "also", severity: "critical" },
  { rx: /\bmoreover\b/gi, weight: 35, exp: "Another AI favorite transition", fix: "plus", severity: "critical" },
  { rx: /\bit is (important|crucial|essential) to note\b/gi, weight: 42, exp: "Formulaic AI phrase - professors know this one", fix: "notably", severity: "critical" },
  { rx: /\bimplement(?:ed|s|ing|ation)?\b/gi, weight: 28, exp: "Business jargon that screams AI", fix: "set up", severity: "high" },
  { rx: /\boptimi[sz]e(?:d|s|ing|ation)?\b/gi, weight: 27, exp: "Tech buzzword - major detector trigger", fix: "improve", severity: "high" },
  { rx: /\bfacilitat(?:e|es|ed|ing|ion)\b/gi, weight: 25, exp: "Formal corporate speak", fix: "help", severity: "high" },
  { rx: /\benhance(?:d|s|ing|ment)?\b/gi, weight: 24, exp: "Overused AI verb choice", fix: "improve", severity: "high" },
  { rx: /\btherefore\b/gi, weight: 20, exp: "Academic connector - sounds robotic", fix: "so", severity: "medium" },
  { rx: /\badditionally\b/gi, weight: 19, exp: "Formal transition word", fix: "also", severity: "medium" },
  { rx: /\bconsequently\b/gi, weight: 18, exp: "Academic language pattern", fix: "so", severity: "medium" },
  { rx: /\bin conclusion\b/gi, weight: 22, exp: "Generic AI ending phrase", fix: "overall", severity: "medium" },
  { rx: /\bcomprehensive\b/gi, weight: 17, exp: "Overused AI adjective", fix: "complete", severity: "medium" },
  { rx: /\bdemonstrate(?:s|d)?\b/gi, weight: 14, exp: "Academic verb choice", fix: "show", severity: "medium" },
  { rx: /\bestablish(?:ed|ing|es)?\b/gi, weight: 13, exp: "Formal language pattern", fix: "set up", severity: "medium" },
  { rx: /\bsignificant(?:ly)?\b/gi, weight: 12, exp: "Overused academic word", fix: "big", severity: "medium" },
  { rx: /\bsubstantial(?:ly)?\b/gi, weight: 11, exp: "Formal descriptor", fix: "large", severity: "medium" }
];

function detectFlags(text) {
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

function calculateScore(text, flags) {
  let baseScore = 20;
  for (const flag of flags) baseScore += flag.impact * 0.8;

  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (words < 100) baseScore += 15;

  if (sentences.length > 2) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    if (variance < 9) baseScore += 20;
    if (avg > 25) baseScore += 15;
  }

  const contractions = (text.match(/\b\w+['’](?:t|re|ll|ve|d|s|m)\b/gi) || []).length;
  if (contractions / Math.max(words, 1) < 0.02) baseScore += 18;

  const passive = (text.match(/\b(?:was|were|been|being)\s+\w+ed\b/gi) || []).length;
  if (passive / sentences.length > 0.3) baseScore += 12;

  const criticals = flags.filter(f => f.severity === 'critical').length;
  const minScore = Math.min(85, 45 + (criticals * 15));

  return Math.max(5, Math.min(95, Math.round(Math.max(baseScore, minScore))));
}

// ================== API ==================
app.post("/analyze", (req, res) => {
  try {
    const { essay = "", userId = "anon", mode = "analyze" } = req.body;
    const user = getUserState(userId);

    if (essay.length < 50 || essay.length > 500) {
      return res.status(200).json({ error: true, message: "Text must be 50-500 characters." });
    }

    // Enforce scan limits
    if (!canScan(userId)) {
      return res.status(200).json({
        error: true,
        message: user.pro ? "Scan limit reached for today." : "Out of scans. Upgrade to Pro or buy an Emergency Fix.",
        upgradeRequired: !user.pro
      });
    }

    const flags = detectFlags(essay);
    const score = calculateScore(essay, flags);
    incrementScan(userId);

    // SUS labels
    let susLabel = "SUS-Free (Low Risk)";
    if (score >= 85) susLabel = "SUS AF (High Risk)";
    else if (score >= 60) susLabel = "Kinda SUS (Medium Risk)";

    // Free users only see blurred results (frontend handles blur)
    const isProOrEmergency = user.pro || mode === "emergency";

    return res.status(200).json({
      score,
      susLabel,
      flags: isProOrEmergency ? flags : [], // Free sees empty array (we’ll blur client-side)
      summary: flags.length === 0 ? "Looks 🔥, Bestie. Go ahead and turn it in." : undefined,
      scansUsed: user.scansUsed,
      upgradeRequired: !isProOrEmergency && user.scansUsed >= 99
    });
  } catch (e) {
    return res.status(500).json({ error: true, message: "Server error: " + e.message });
  }
});

app.listen(PORT, () => console.log(`✅ False Flag Fixer running on port ${PORT}`));
