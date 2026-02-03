import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { enhanceTextFlags, getContextAwareReplacements } from './lib/context-aware-replacements.js';
import { enhanceStructuralFlags, getFlowRiskSummary } from './lib/flow-risk-analysis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Cache-busting middleware MUST run BEFORE static files
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ERROR: ANTHROPIC_API_KEY not found in environment variables!');
  console.error('📝 Please create a .env file in the project root with:');
  console.error('   ANTHROPIC_API_KEY=sk-ant-api03-your-full-key-here');
  console.error('💡 Get your API key from: https://console.anthropic.com/');
  process.exit(1);
}

/**
 * PATTERN-BASED REPLACEMENTS
 * These preserve meaning while removing AI detection triggers
 * 
 * ⚠️ IMPORTANT: This object is READ-ONLY. Never modify it.
 * It's declared as `const` to prevent accidental mutations.
 */
const ANTI_AI_REPLACEMENTS = {
  // === LONG PHRASE PATTERNS ===
  "leveraging cutting-edge technologies": ["using modern tech", "applying current technologies", "working with newer tools"],
  "leverage cutting-edge capabilities": ["use modern features", "apply current capabilities", "work with newer abilities"],
  "leverage cutting-edge solutions": ["use modern solutions", "apply current approaches", "work with newer methods"],
  "leverage cutting-edge": ["use modern", "apply current", "work with newer"],
  
  "unprecedented levels of efficiency": ["higher efficiency", "better efficiency", "improved efficiency"],
  "unprecedented levels of performance": ["better performance", "improved performance", "stronger results"],
  "unprecedented levels of productivity": ["higher productivity", "better output", "improved productivity"],
  "unprecedented levels of": ["higher levels of", "better", "improved"],
  
  "achieve unprecedented levels": ["reach higher levels", "get better results", "improve significantly"],
  "demonstrate unprecedented": ["show remarkable", "achieve notable", "display significant"],
  "demonstrate exceptional results": ["show great results", "achieve strong outcomes", "get impressive results"],
  "demonstrate exceptional": ["show great", "achieve strong", "display impressive"],
  
  "cutting-edge technologies": ["modern technologies", "current tech", "newer tools"],
  "cutting-edge capabilities": ["modern features", "current abilities", "newer capabilities"],
  "cutting-edge solutions": ["modern solutions", "current approaches", "newer methods"],
  
  "facilitate unprecedented outcomes": ["enable better results", "help achieve strong outcomes", "support improved results"],
  "facilitate exceptional": ["enable strong", "help achieve great", "support impressive"],
  
  "utilizing these tools allows organizations": ["using these tools helps companies", "these tools let businesses", "with these tools, companies can"],
  "utilizing these tools": ["using these tools", "with these tools", "by using these tools"],
  
  "rapidly evolving digital landscape": ["fast-changing digital world", "quickly changing tech environment", "constantly shifting digital space"],
  "rapidly evolving landscape": ["fast-changing world", "quickly evolving space", "shifting environment"],
  "digital landscape": ["digital world", "tech environment", "online space"],
  
  "it is important to note that": ["keep in mind that", "note that", "remember that"],
  "it is crucial to": ["you need to", "it's important to", "make sure to"],
  "it is essential to": ["you must", "it's vital to", "you need to"],
  "it should be noted that": ["note that", "keep in mind", "by the way"],
  "it is worth noting": ["interestingly", "also", "note that"],
  "one might consider": ["you could", "consider", "try"],
  "it is imperative that": ["you must", "it's critical", "make sure"],
  "it is evident that": ["clearly", "obviously", "it's clear"],
  
  "the data suggests that": ["research shows", "studies show", "data shows"],
  "it has been shown that": ["research shows", "we know that", "studies prove"],
  "research indicates": ["studies show", "research shows", "data shows"],
  "studies suggest": ["research shows", "studies show", "we found"],
  
  // Corporate jargon
  "utilize": ["use", "try", "work with"],
  "utilizes": ["uses", "works with", "tries"],
  "utilizing": ["using", "working with", "trying"],
  "utilization": ["use", "usage", "using"],
  "facilitate": ["help", "make easier", "support"],
  "facilitates": ["helps", "makes easier", "supports"],
  "facilitating": ["helping", "making easier", "supporting"],
  "leverage": ["use", "tap into", "work with"],
  "leverages": ["uses", "taps into", "works with"],
  "leveraging": ["using", "tapping into", "working with"],
  "optimize": ["improve", "make better", "boost"],
  "optimizes": ["improves", "makes better", "boosts"],
  "optimizing": ["improving", "making better", "boosting"],
  "implement": ["use", "add", "set up"],
  "implements": ["uses", "adds", "sets up"],
  "implementing": ["using", "adding", "setting up"],
  "achieve": ["get", "reach", "hit"],
  "achieves": ["gets", "reaches", "hits"],
  "achieving": ["getting", "reaching", "hitting"],
  "allows": ["lets", "enables", "makes it possible"],
  "allow": ["let", "enable", "make it possible"],
  
  "organizations": ["companies", "businesses", "firms"],
  "organization": ["company", "business", "firm"],
  "capabilities": ["abilities", "features", "skills"],
  "capability": ["ability", "feature", "skill"],
  "efficiency": ["results", "productivity", "output"],
  "efficiencies": ["results", "gains", "improvements"],
  
  // Transition words
  "furthermore": ["also", "plus", "and", "besides"],
  "moreover": ["also", "besides", "plus", "too"],
  "additionally": ["also", "plus", "too", "and"],
  "consequently": ["so", "therefore", "as a result", "because of this"],
  "therefore": ["so", "thus", "meaning", "which means"],
  "thus": ["so", "therefore", "meaning", "this means"],
  "hence": ["so", "therefore", "that's why", "which is why"],
  "nevertheless": ["but", "still", "however", "even so"],
  "nonetheless": ["but", "still", "yet", "even so"],
  "subsequently": ["later", "then", "after that", "next"],
  
  // Buzzwords
  "multifaceted": ["complex", "many-sided", "varied", "complicated"],
  "paradigm": ["model", "approach", "system", "framework"],
  "holistic": ["complete", "whole", "full", "comprehensive"],
  "synergy": ["teamwork", "cooperation", "collaboration", "working together"],
  "robust": ["strong", "solid", "reliable", "sturdy"],
  "comprehensive": ["complete", "thorough", "detailed", "full"],
  "dynamic": ["changing", "active", "lively", "flexible"],
  "innovative": ["new", "creative", "original", "fresh"],
  "strategic": ["planned", "smart", "thoughtful", "calculated"],
  "seamless": ["smooth", "easy", "effortless", "simple"],
  "optimal": ["best", "ideal", "perfect", "top"],
  "substantial": ["big", "large", "significant", "major"],
  
  // Formal verbs
  "demonstrate": ["show", "prove", "display", "reveal"],
  "demonstrates": ["shows", "proves", "displays", "reveals"],
  "demonstrating": ["showing", "proving", "displaying", "revealing"],
  "ascertain": ["find out", "figure out", "learn", "discover"],
  "endeavor": ["try", "attempt", "effort", "work"],
  "obtain": ["get", "receive", "acquire", "gain"],
  "purchase": ["buy", "get", "pick up", "acquire"],
  "assist": ["help", "support", "aid", "back up"],
  "inquire": ["ask", "question", "wonder", "check"],
  "commence": ["start", "begin", "kick off", "launch"],
  "terminate": ["end", "stop", "finish", "conclude"],
  "retain": ["keep", "hold", "maintain", "preserve"],
  "indicate": ["show", "suggest", "point to", "reveal"],
  "conduct": ["do", "carry out", "perform", "run"],
  "provide": ["give", "offer", "supply", "deliver"],
  
  // Vague phrases
  "various contexts": ["different situations", "many cases", "various scenarios"],
  "wide range of": ["many", "lots of", "several", "various"],
  "numerous aspects": ["many parts", "several things", "various elements"],
  "significant impact": ["big effect", "major change", "strong influence"],
  "considerable amount": ["a lot", "much", "plenty", "lots"],
  "in terms of": ["for", "about", "regarding", "concerning"],
  "with regard to": ["about", "concerning", "regarding", "for"],
  "it can be seen that": ["clearly", "you can see", "obviously"],
  "it is interesting to note": ["interestingly", "notably", "note that"],
  
  // Prepositional phrases
  "in order to": ["to", "so you can", "for", "so that"],
  "due to the fact that": ["because", "since", "as", "given that"],
  "at this point in time": ["now", "currently", "today", "right now"],
  "prior to": ["before", "earlier than", "ahead of"],
  "subsequent to": ["after", "following", "later than"],
  "in relation to": ["about", "regarding", "for", "concerning"],
  "with reference to": ["about", "regarding", "concerning", "for"],
  
  // Performance words
  "unprecedented": ["amazing", "remarkable", "extraordinary", "incredible"],
  "unparalleled": ["unmatched", "unique", "one-of-a-kind", "incomparable"],
  "exceptional": ["great", "outstanding", "excellent", "remarkable"],
  "remarkable": ["notable", "impressive", "striking", "significant"],
  
  // Single word triggers
  "methodology": ["method", "approach", "process", "technique"],
  "framework": ["structure", "system", "model", "setup"],
  "infrastructure": ["foundation", "structure", "framework", "base"],
  "parameters": ["limits", "boundaries", "factors", "conditions"],
  "criterion": ["standard", "measure", "benchmark", "rule"],
  "criteria": ["standards", "measures", "benchmarks", "rules"]
};

/**
 * STRUCTURAL FIX PATTERNS
 */
const HUMANIZATION_FIXES = {
  contractions: [
    { from: " do not ", to: " don't " },
    { from: " does not ", to: " doesn't " },
    { from: " did not ", to: " didn't " },
    { from: " can not ", to: " can't " },
    { from: " cannot ", to: " can't " },
    { from: " will not ", to: " won't " },
    { from: " would not ", to: " wouldn't " },
    { from: " should not ", to: " shouldn't " },
    { from: " could not ", to: " couldn't " },
    { from: " is not ", to: " isn't " },
    { from: " are not ", to: " aren't " },
    { from: " was not ", to: " wasn't " },
    { from: " were not ", to: " weren't " },
    { from: " have not ", to: " haven't " },
    { from: " has not ", to: " hasn't " },
    { from: " had not ", to: " hadn't " },
    { from: " it is ", to: " it's " },
    { from: " that is ", to: " that's " },
    { from: " there is ", to: " there's " },
    { from: " here is ", to: " here's " },
    { from: " what is ", to: " what's " },
    { from: " who is ", to: " who's " },
    { from: " let us ", to: " let's " }
  ]
};

/**
 * ENHANCED PATTERN SUGGESTIONS WITH EXAMPLES
 * Provides detailed explanations, before/after examples, and actionable steps
 */
const PATTERN_SUGGESTIONS = {
  "No contractions found": {
    explanation: "AI writes formally. Real students use 'don't', 'can't', 'won't', 'it's'. This is the #1 red flag for Turnitin.",
    examples: [
      { before: "do not", after: "don't", reason: "natural" },
      { before: "will not", after: "won't", reason: "conversational" },
      { before: "cannot", after: "can't", reason: "human" },
      { before: "it is", after: "it's", reason: "casual" }
    ],
    actionable: "Find & Replace: 'do not'→'don't', 'cannot'→'can't', 'will not'→'won't', 'is not'→'isn't'"
  },
  
  "No personal voice": {
    explanation: "Detectors flag writing that never says 'I', 'my', 'we', 'our'. Adding your perspective makes it sound human.",
    examples: [
      { before: "The research shows that...", after: "I think the research shows that...", reason: "adds your voice" },
      { before: "Studies indicate...", after: "From what I've read, studies indicate...", reason: "personal touch" },
      { before: "It is believed that...", after: "In my opinion, ...", reason: "human perspective" }
    ],
    actionable: "Add 'I think', 'I believe', 'in my opinion' to 3-4 sentences. Pick ones where you're making claims."
  },
  
  "Overly formal language": {
    explanation: "Words like 'utilize', 'leverage', 'facilitate' scream AI. Use everyday words instead.",
    examples: [
      { before: "utilize", after: "use", reason: "simpler" },
      { before: "leverage", after: "tap into or use", reason: "more human" },
      { before: "facilitate", after: "help with", reason: "casual" }
    ],
    actionable: "Search for: utilize, leverage, facilitate, implement, optimize. Replace with simpler words."
  },
  
  "Uniform sentence length": {
    explanation: "AI generates sentences that are all the same length (15-25 words). Humans vary: short. Long ones. Medium.",
    examples: [
      { before: "The implementation of new systems requires careful planning.", after: "New systems need planning. Big planning.", reason: "varied length" },
      { before: "Sentences are all similar.", after: "Short. Then a longer sentence with more detail. Medium.", reason: "mix it up" }
    ],
    actionable: "Read aloud. If every sentence sounds the same rhythm, break long ones into shorter ones. Add a 5-word sentence next to a 30-word one."
  }
};

/**
 * Extract example from essay for a specific pattern
 */
function extractExampleFromEssay(essay, patternName) {
  const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 15);
  
  if (patternName === "No contractions found") {
    for (const sent of sentences) {
      if (sent.match(/\b(do not|cannot|will not|is not|are not)\b/i)) {
        return sent.trim().substring(0, 100) + (sent.trim().length > 100 ? "..." : "");
      }
    }
  } else if (patternName === "No personal voice") {
    for (const sent of sentences) {
      if (sent.match(/^(The|It|Research|Studies|Data|This)/i) && !sent.match(/\b(I|my|we|our)\b/i)) {
        return sent.trim().substring(0, 100) + (sent.trim().length > 100 ? "..." : "");
      }
    }
  } else if (patternName === "Overly formal language") {
    for (const sent of sentences) {
      if (sent.match(/\b(utilize|leverage|facilitate|implement|optimize)\b/i)) {
        return sent.trim().substring(0, 100) + (sent.trim().length > 100 ? "..." : "");
      }
    }
  }
  
  return null;
}

/**
 * Enhance a flag with detailed suggestions and essay examples
 */
function enhanceFlagWithExamples(flag, essay) {
  const patternInfo = PATTERN_SUGGESTIONS[flag.phrase];
  
  if (!patternInfo) {
    return flag; // Return original if no enhancement
  }
  
  return {
    ...flag,
    explanation: patternInfo.explanation,
    examples: patternInfo.examples,
    actionable: patternInfo.actionable,
    exampleFromEssay: extractExampleFromEssay(essay, flag.phrase),
    enhancement: true
  };
}

/**
 * Categorize flags into text phrases vs structural patterns
 */
function categorizeFlags(flags, essay) {
  const isStructuralFlag = (flag) => {
    if (!flag || !flag.phrase) return false;
    
    const phrase = flag.phrase.toLowerCase();
    
    // If phrase doesn't appear in text, it's structural
    if (!essay.toLowerCase().includes(phrase)) {
      return true;
    }
    
    // Check for structural keywords
    const structuralKeywords = [
      'structural', 'pattern', 'contraction', 'sentence length', 
      'overall writing', 'grammar', 'formal', 'tone', 'style',
      'personal voice', 'uniform', 'repetitive'
    ];
    
    const combinedText = `${phrase} ${flag.reason || ''} ${flag.explanation || ''}`.toLowerCase();
    return structuralKeywords.some(keyword => combinedText.includes(keyword));
  };
  
  return {
    textPhraseFlags: flags.filter(flag => !isStructuralFlag(flag)),
    structuralFlags: flags.filter(flag => isStructuralFlag(flag))
  };
}

/**
 * TURNITIN AI DETECTION ENGINE
 */
class HaikuAIDetector {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.model = 'claude-haiku-4-5-20251001';
    this.maxRetries = 2;
  }

  async analyzeEssay(essay) {
    if (!essay || essay.trim().length < 50) {
      return {
        score: 0,
        confidence: 0,
        verdict: 'You\'re Good',
        flags: [],
        analysis: 'Essay too short to analyze.',
        mode: 'insufficient_data'
      };
    }

    const context = this.analyzeContext(essay);
    let result;
    let usedFallback = false;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        result = await this.callHaikuAPI(essay, context);
        break;
      } catch (error) {
        console.warn(`⚠️ Haiku attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
        if (attempt === this.maxRetries) {
          console.error('❌ All Haiku attempts failed, using pattern fallback');
          result = this.comprehensivePatternDetection(essay, context);
          usedFallback = true;
        } else {
          await this.sleep(1000 * attempt);
        }
      }
    }

    if (!usedFallback) {
      result.flags = this.addMissedPatterns(result.flags, essay);
    }

    result.flags = result.flags.map(flag => this.intelligentlyEnhanceAlternatives(flag, essay));
    const adjusted = this.applyContextAdjustments(result, context, essay);
    
    return {
      ...adjusted,
      mode: usedFallback ? 'fallback' : 'haiku'
    };
  }

  comprehensivePatternDetection(essay, context) {
    console.warn('⚠️ Using comprehensive pattern detection');
    
    // ⚠️ MEMORY SAFETY: All variables are LOCAL and reset on each call
    // No global state is modified or accumulated
    // FIXED: Start lower for clean essays (5 instead of 20)
    let score = 5;
    const flags = []; // Fresh array each time - no accumulation
    const foundPhrases = new Set(); // Fresh Set each time - no accumulation
    let triggerWordCount = 0; // Fresh counter each time

    // 🔍 AGGRESSIVE DEBUG LOGGING
    console.log('🔍 SCORING DEBUG:');
    console.log('   Starting score:', score);

    for (const [trigger, replacements] of Object.entries(ANTI_AI_REPLACEMENTS)) {
      const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
      const matches = essay.match(regex);
      
      if (matches) {
        const matchCount = matches.length;
        const uniqueMatches = new Set();
        matches.forEach(match => {
          const normalized = match.toLowerCase();
          if (!foundPhrases.has(normalized)) {
            foundPhrases.add(normalized);
            uniqueMatches.add(normalized);
            triggerWordCount++;
            // FIXED: More aggressive scoring - each trigger word adds more
            score += 12; // Increased from 8 to 12
            flags.push({
              phrase: match,
              reason: 'AI trigger word detected',
              explanation: `"${match}" is commonly flagged by Turnitin AI detection.`,
              alternatives: replacements.slice(0, 4),
              severity: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low'
            });
          }
        });
        const pointsAdded = 12 * uniqueMatches.size;
        console.log(`   Found "${trigger}": ${matchCount} times, ${uniqueMatches.size} unique, +${pointsAdded} points (score now: ${score})`);
      }
    }

    console.log('   Found trigger words (unique):', foundPhrases.size);
    console.log('   Score after trigger words:', score);

    // FIXED: More aggressive structural penalties
    if (!context.hasContractions) {
      score += 20; // Increased from 15 to 20
      console.log('   No contractions? YES +20');
      flags.push({
        phrase: 'No contractions found',
        reason: 'Overly formal writing',
        explanation: 'Human writing typically uses contractions like "don\'t", "can\'t", "it\'s".',
        alternatives: ["Add contractions throughout", "Use don't instead of do not", "Use it's instead of it is"],
        severity: 'medium'
      });
    } else {
      console.log('   No contractions? NO (has contractions)');
    }

    if (!context.hasFirstPerson && context.writingStyle !== 'academic') {
      score += 12; // Increased from 10 to 12
      console.log('   No first person? YES +12');
      flags.push({
        phrase: 'No personal voice',
        reason: 'Lacks human perspective',
        explanation: 'Adding personal pronouns (I, my, we) makes writing sound more human.',
        alternatives: ["Add 'I think' or 'I believe'", "Use 'in my opinion'", "Include personal perspective"],
        severity: 'low'
      });
    } else {
      console.log('   No first person? NO (has first person or academic style)');
    }

    console.log('   Score after structural checks:', score);

    // FIXED: More generous bonuses for human-like writing
    if (context.hasContractions) {
      score -= 15; // Increased from 10 to 15
      console.log('   Has contractions bonus: -15');
    }
    if (context.hasFirstPerson) {
      score -= 12; // Increased from 8 to 12
      console.log('   Has first person bonus: -12');
    }
    if (context.hasQuestions) {
      score -= 8; // Increased from 5 to 8
      console.log('   Has questions bonus: -8');
    }

    // FIXED: Bonus for very clean essays (multiple human indicators)
    if (context.hasContractions && context.hasFirstPerson && triggerWordCount === 0) {
      score -= 10; // Extra bonus for truly clean writing
      console.log('   Extra clean writing bonus: -10');
    }

    const finalScore = Math.max(0, Math.min(100, score));
    
    console.log('   FINAL SCORE:', finalScore);
    console.log('   Verdict:', this.getVerdictFromScore(finalScore));
    console.log('   Expected range: 0-29=Good, 30-69=Sus, 70-100=Hella');
    console.log('   Flags found:', flags.length);

    // Enhance structural flags with detailed examples
    const enhancedFlags = flags.slice(0, 15).map(flag => enhanceFlagWithExamples(flag, essay));

    return {
      score: finalScore,
      confidence: 50,
      verdict: this.getVerdictFromScore(finalScore),
      flags: enhancedFlags,
      analysis: 'Comprehensive pattern analysis completed.',
      turnitinComparison: `Score: ${finalScore}%`
    };
  }

  addMissedPatterns(existingFlags, essay) {
    const flaggedPhrases = new Set(
      existingFlags.map(f => f.phrase.toLowerCase().trim())
    );
    
    const additionalFlags = [];

    for (const [trigger, replacements] of Object.entries(ANTI_AI_REPLACEMENTS)) {
      if (flaggedPhrases.has(trigger)) continue;
      
      const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
      const matches = essay.match(regex);
      
      if (matches) {
        matches.forEach(match => {
          const normalized = match.toLowerCase();
          if (!flaggedPhrases.has(normalized)) {
            flaggedPhrases.add(normalized);
            additionalFlags.push({
              phrase: match,
              reason: 'AI pattern detected',
              explanation: `"${match}" is an AI indicator that should be replaced.`,
              alternatives: replacements.slice(0, 4),
              severity: 'medium'
            });
          }
        });
      }
    }

    if (additionalFlags.length > 0) {
      console.log(`🔍 Found ${additionalFlags.length} additional AI patterns Haiku missed`);
    }

    return [...existingFlags, ...additionalFlags];
  }

  intelligentlyEnhanceAlternatives(flag, essay) {
    const phrase = flag.phrase.toLowerCase().trim();
    
    const hasSpecificAlts = flag.alternatives && 
      flag.alternatives.length >= 2 &&
      flag.alternatives.every(alt => alt.length > 0 && alt.length < 100) &&
      !flag.alternatives.some(alt => 
        ['rephrase', 'naturally', 'simpler', 'different way', 'own words', 'reword']
          .some(vague => alt.toLowerCase().includes(vague))
      );
    
    if (hasSpecificAlts) {
      return flag;
    }
    
    let databaseMatch = null;
    
    if (ANTI_AI_REPLACEMENTS[phrase]) {
      databaseMatch = ANTI_AI_REPLACEMENTS[phrase];
    } else {
      // OPTIMIZATION: Limit search to prevent memory issues
      // Only check first 200 keys to avoid processing entire dictionary
      const keysToCheck = Object.keys(ANTI_AI_REPLACEMENTS).slice(0, 200);
      const matchingPatterns = keysToCheck
        .filter(trigger => phrase.includes(trigger) || trigger.includes(phrase))
        .sort((a, b) => b.length - a.length);
      
      if (matchingPatterns.length > 0) {
        const bestMatch = matchingPatterns[0];
        const replacements = ANTI_AI_REPLACEMENTS[bestMatch];
        
        if (phrase.includes(bestMatch)) {
          const beforePattern = phrase.substring(0, phrase.indexOf(bestMatch));
          const afterPattern = phrase.substring(phrase.indexOf(bestMatch) + bestMatch.length);
          
          if (beforePattern || afterPattern) {
            databaseMatch = replacements.map(replacement => 
              beforePattern + replacement + afterPattern
            );
          } else {
            databaseMatch = replacements;
          }
        } else {
          databaseMatch = replacements;
        }
      }
    }
    
    if (databaseMatch && databaseMatch.length > 0) {
      flag.alternatives = databaseMatch.slice(0, 3);
      flag.explanation = `⚠️ AI TRIGGER: "${flag.phrase}"\n\n💡 Safe alternatives:\n${databaseMatch.slice(0, 3).map((alt, i) => `   ${i + 1}. "${alt}"`).join('\n')}`;
      return flag;
    }
    
    flag.alternatives = [
      "Use simpler everyday words",
      "Add contractions (don't, can't, isn't)",
      "Break into shorter sentences",
      "Use 'I think' or 'in my opinion'"
    ];
    
    return flag;
  }

  async callHaikuAPI(essay, context) {
    const systemPrompt = this.getAggressiveSystemPrompt();
    const userPrompt = this.getAggressiveUserPrompt(essay);

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: Math.min(2000, Math.max(1000, context.wordCount * 2)), // Reduced from 2000-4000 to 1000-2000 for faster response
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Haiku');
      }
      result = JSON.parse(jsonMatch[0]);
    }

    return this.validateHaikuResponse(result, essay);
  }

  validateHaikuResponse(result, essay) {
    if (typeof result.score !== 'number' || !Array.isArray(result.flags)) {
      throw new Error('Invalid Haiku response structure');
    }

    const validated = {
      score: this.ensureNumber(result.score, 0, 100),
      confidence: this.ensureNumber(result.confidence, 50, 100),
      verdict: result.verdict || this.getVerdictFromScore(result.score),
      flags: this.validateFlags(result.flags),
      analysis: result.analysis || 'Analysis completed.',
      turnitinComparison: result.turnitinComparison || 'Comparison unavailable'
    };

    if (validated.score >= 30 && validated.flags.length === 0) {
      console.warn('⚠️ Haiku returned score', validated.score, 'but 0 flags');
      validated.flags.push({
        phrase: 'Overall writing patterns',
        reason: 'Structural AI characteristics',
        explanation: 'Your writing has AI-like structure. Add contractions, personal voice, and vary sentence length.',
        alternatives: [
          "Use don't instead of do not",
          "Add 'I think' for personal voice",
          "Mix short and long sentences",
          "Use casual words like 'really' or 'actually'"
        ],
        severity: validated.score >= 70 ? 'high' : 'medium'
      });
    }

    return validated;
  }

  validateFlags(flags) {
    return flags
      .filter(flag => flag && flag.phrase && flag.phrase.trim().length > 0)
      .map(flag => ({
        phrase: flag.phrase.trim(),
        reason: flag.reason || 'AI pattern detected',
        explanation: flag.explanation || flag.reason || 'This shows AI-like characteristics',
        alternatives: Array.isArray(flag.alternatives) && flag.alternatives.length > 0 
          ? flag.alternatives.filter(alt => alt && alt.trim().length > 0)
          : [],
        severity: ['high', 'medium', 'low'].includes(flag.severity) ? flag.severity : 'medium'
      }));
  }

  analyzeContext(essay) {
    const words = essay.split(/\s+/);
    const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const wordCount = words.length;
    const avgSentenceLength = words.length / sentences.length;
    const hasContractions = /\b(don't|can't|won't|isn't|aren't|it's|i'm|you're|we're|they're|didn't|doesn't|haven't|hasn't|wouldn't|shouldn't|couldn't)\b/i.test(essay);
    const hasFirstPerson = /\b(I|my|mine|me|we|our|us)\b/g.test(essay);
    const hasQuestions = /\?/.test(essay);
    
    let writingStyle = 'general';
    if (essay.match(/\b(hypothesis|methodology|participants|results|conclusion|abstract|research)\b/i)) {
      writingStyle = 'academic';
    } else if (essay.match(/\b(character|protagonist|setting|plot|narrative|story)\b/i)) {
      writingStyle = 'creative';
    } else if (essay.match(/\b(project|deadline|meeting|team|client|deliverable)\b/i)) {
      writingStyle = 'business';
    } else if (hasFirstPerson && hasContractions && avgSentenceLength < 20) {
      writingStyle = 'casual';
    }
    
    return {
      wordCount,
      avgSentenceLength,
      hasContractions,
      hasFirstPerson,
      hasQuestions,
      writingStyle,
      formalityLevel: this.calculateFormality(essay, writingStyle)
    };
  }

  calculateFormality(essay, style) {
    const formalWords = (essay.match(/\b(furthermore|moreover|consequently|therefore|thus|hence)\b/gi) || []).length;
    const casualWords = (essay.match(/\b(basically|honestly|literally|actually|like|just|really)\b/gi) || []).length;
    
    if (style === 'academic') return 'high-expected';
    if (style === 'business') return 'medium-expected';
    if (style === 'casual') return 'low-expected';
    
    if (formalWords > casualWords * 2) return 'high-unexpected';
    if (casualWords > formalWords * 2) return 'low-unexpected';
    return 'medium';
  }

  applyContextAdjustments(result, context, essay) {
    let adjustedScore = result.score;
    const adjustments = [];

    if (context.writingStyle === 'academic' && context.formalityLevel === 'high-expected') {
      if (adjustedScore >= 50 && adjustedScore < 80) {
        const reduction = Math.min(12, Math.floor((adjustedScore - 50) * 0.25));
        adjustedScore = Math.max(adjustedScore - reduction, 30);
        adjustments.push(`Academic formality: -${reduction}%`);
      }
    }

    if (context.wordCount < 150) {
      adjustedScore = Math.max(adjustedScore - 10, 0);
      adjustments.push('Short text: -10%');
    }

    const confidence = this.calculateConfidence(result, context, adjustedScore);
    const finalScore = Math.round(adjustedScore);

    if (adjustments.length > 0) {
      console.log('📊 Adjustments:', adjustments);
      console.log(`   Original: ${result.score} → Final: ${finalScore}`);
    }

    return {
      score: finalScore,
      confidence,
      verdict: this.getVerdictFromScore(finalScore),
      flags: result.flags,
      analysis: result.analysis,
      turnitinComparison: result.turnitinComparison,
      adjustments: adjustments.length > 0 ? adjustments : ['No adjustments']
    };
  }

  calculateConfidence(result, context, adjustedScore) {
    let confidence = 50;

    const flagCount = result.flags.length;
    if (flagCount >= 8) confidence += 35;
    else if (flagCount >= 5) confidence += 25;
    else if (flagCount >= 3) confidence += 15;
    else if (flagCount >= 1) confidence += 10;

    const highSeverityCount = result.flags.filter(f => f.severity === 'high').length;
    confidence += highSeverityCount * 5;

    if (adjustedScore >= 70) {
      if (context.hasContractions) confidence -= 15;
      if (context.hasFirstPerson) confidence -= 10;
      if (context.hasQuestions) confidence -= 5;
    }

    if (context.wordCount < 150) confidence -= 20;

    return Math.max(40, Math.min(100, confidence));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  ensureNumber(value, min, max) {
    const num = parseInt(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  getVerdictFromScore(score) {
    if (score >= 70) return 'Major Sus';
    if (score >= 30) return 'Mid Sus';
    return 'Low Sus';
  }

  getAggressiveSystemPrompt() {
    return `You are Turnitin's AI detection algorithm set to MAXIMUM SENSITIVITY.

SCORING (be strict):
- 0-29 "Low Sus" = Clean human writing
- 30-69 "Mid Sus" = Multiple AI patterns
- 70-100 "Major Sus" = Obviously AI-generated

TOP AI TRIGGERS:
- "leverage/leveraging/utilize/utilizing/facilitate/demonstrate"
- "it is important to note that/furthermore/moreover"
- "unprecedented/multifaceted/paradigm/holistic/robust"
- "in order to/prior to"
- "cutting-edge/rapidly evolving"

STRUCTURAL PATTERNS:
- No contractions = +20
- Perfect grammar = +15
- Same sentence length = +10
- No personal pronouns = +10

HUMAN INDICATORS:
- Contractions = -10
- Personal voice = -10
- Questions = -5
- Casual words = -5

FLAG COUNT:
- Score 70-100: 10-15 phrases
- Score 50-69: 7-10 phrases
- Score 30-49: 4-6 phrases
- Score 0-29: 0-2 phrases

FOR EACH FLAG provide 3 alternatives that:
- Keep exact meaning
- Use simpler words
- Are grammatically complete

Return ONLY JSON:
{
  "score": 0-100,
  "confidence": 50-100,
  "verdict": "Low Sus" | "Mid Sus" | "Major Sus",
  "flags": [
    {
      "phrase": "exact text",
      "reason": "why AI",
      "explanation": "detailed",
      "alternatives": ["option1", "option2", "option3"],
      "severity": "high" | "medium" | "low"
    }
  ],
  "analysis": "assessment",
  "turnitinComparison": "prediction"
}`;
  }

  getAggressiveUserPrompt(essay) {
    return `ULTRA-AGGRESSIVE ANALYSIS REQUIRED. Students need to know EVERY AI pattern before Turnitin sees it.

${essay}

YOUR MISSION:
1. Find EVERY AI trigger word/phrase (not just the obvious ones)
2. Flag structural patterns (no contractions, perfect grammar, uniform sentences)
3. For EACH flag, provide 3-4 SPECIFIC replacement words
4. Be HARSH - better to over-flag than under-flag

CRITICAL:
- If you see "utilize" ANYWHERE → FLAG IT
- If you see "leverage" ANYWHERE → FLAG IT
- If you see "furthermore/moreover" → FLAG IT
- If you see "demonstrate" → FLAG IT
- If you see "facilitate" → FLAG IT
- No contractions? → FLAG IT as structural issue
- Perfect grammar? → FLAG IT as structural issue

Students' grades depend on this. Find EVERYTHING.
Return ONLY JSON with 10+ flags if score is high.`;
  }
}

// Initialize detector
const haikuDetector = new HaikuAIDetector(ANTHROPIC_API_KEY);

// Routes
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: './public' }, (err) => {
    if (err) {
      res.json({
        status: 'ok',
        message: 'False Flag Fixer API - ULTRA AGGRESSIVE v4.0',
        version: '4.0.0',
        features: [
          'Ultra-aggressive pattern detection',
          'Comprehensive 100+ word database',
          'Finds ALL instances, not just first',
          'Three-pass detection system'
        ],
        endpoints: {
          health: 'GET /health',
          analyze: 'POST /analyze',
          quickfix: 'POST /quickfix'
        }
      });
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server running',
    detector: 'Haiku v4.0 ULTRA AGGRESSIVE - finds everything'
  });
});

app.post('/analyze', async (req, res) => {
  // Set 30 second timeout for the entire request
  const timeout = setTimeout(() => {
    console.error('❌ /analyze request TIMEOUT - took longer than 30 seconds');
    if (!res.headersSent) {
      res.status(500).json({ error: 'Analysis timeout', message: 'Request took too long to process' });
    }
  }, 30000);
  
  // Memory tracking
  const memBefore = process.memoryUsage();
  console.log('📊 Memory BEFORE request:', {
    heapUsed: Math.round(memBefore.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memBefore.heapTotal / 1024 / 1024) + ' MB',
    external: Math.round(memBefore.external / 1024 / 1024) + ' MB'
  });
  
  try {
    const { essay, tier = 'free' } = req.body;
    
    if (!essay || typeof essay !== 'string') {
      clearTimeout(timeout);
      return res.status(400).json({ 
        error: 'Invalid request. Expected { essay: string }' 
      });
    }

    console.log(`📝 Analyzing essay (${essay.length} characters) - Tier: ${tier}`);

    let result;
    
    if (tier === 'free') {
      console.log('💰 Using LOCAL detection (free tier - no cost)');
      console.log('   Step 1: Analyzing context...');
      const context = haikuDetector.analyzeContext(essay);
      console.log('   Step 2: Running comprehensive pattern detection...');
      result = haikuDetector.comprehensivePatternDetection(essay, context);
      console.log(`   Step 3: Enhancing ${result.flags.length} flags...`);
      // SAFEGUARD: Limit flags to prevent memory issues (max 50 flags)
      const flagsToProcess = result.flags.slice(0, 50);
      result.flags = flagsToProcess.map(flag => haikuDetector.intelligentlyEnhanceAlternatives(flag, essay));
      console.log('   Step 4: Applying context adjustments...');
      const adjusted = haikuDetector.applyContextAdjustments(result, context, essay);
      result = { ...adjusted, mode: 'local-free' };
      
      // DEBUG: Log final score and verdict
      console.log('📊 FINAL SCORE FROM /analyze ENDPOINT:');
      console.log('   Score:', result.score);
      console.log('   Verdict:', result.verdict);
      console.log('   Flags count:', result.flags.length);
      console.log('   Expected frontend display:', result.score >= 70 ? 'Major Sus' : (result.score >= 30 ? 'Mid Sus' : 'Low Sus'));
    } else {
      console.log('💎 Using HAIKU API (pro tier)');
      result = await haikuDetector.analyzeEssay(essay);
    }

    if (result.mode === 'fallback') {
      console.warn('⚠️ Used pattern fallback mode');
    }

    console.log('   Step 5: Categorizing flags...');
    const categorized = categorizeFlags(result.flags, essay);
    console.log(`   Step 6: Processing ${categorized.textPhraseFlags.length} text flags and ${categorized.structuralFlags.length} structural flags...`);

    // ★★★ HELPER FUNCTIONS ★★★
    const getFixPriority = (flag) => {
      if (flag.severity === 'high') return '🟥 FIX FIRST';
      if (flag.phrase.includes('contraction')) return '🟨 QUICK WIN';
      if (!flag.phrase.includes(' ')) return '🟩 EASY';
      return '🟦 MEDIUM';
    };

    const getBestAlternative = (flag) => {
      if (!flag.alternatives || flag.alternatives.length === 0) {
        return 'Rephrase naturally';
      }
      return flag.alternatives
        .sort((a, b) => a.length - b.length)
        .find(alt => alt.length < 50) || flag.alternatives[0];
    };

    const getTimeEstimate = (flag) => {
      const wordCount = flag.phrase.split(' ').length;
      if (wordCount === 1) return '10 seconds';
      if (wordCount <= 3) return '20 seconds';
      if (flag.severity === 'high') return 'Fix immediately';
      return '30 seconds';
    };

    const getCategory = (flag, isStructural) => {
      if (isStructural) {
        if (flag.phrase.includes('contraction')) return 'Natural Speech';
        if (flag.phrase.includes('sentence')) return 'Sentence Variety';
        if (flag.phrase.includes('voice')) return 'Personal Touch';
        return 'Writing Style';
      }
      return 'AI Trigger Words';
    };

    // ★★★ ENHANCE TEXT PHRASE FLAGS ★★★
    // Use context-aware replacements to enhance flags
    const baseTextFlags = categorized.textPhraseFlags.map(flag => {
      const bestFix = getBestAlternative(flag);
      return {
        phrase: flag.phrase,
        severity: flag.severity,
        explanation: flag.explanation,
        alternatives: flag.alternatives || [],
        bestFix: bestFix // Keep for Step 3 processing
      };
    });
    const enhancedTextFlags = enhanceTextFlags(baseTextFlags, essay);

    // ★★★ ENHANCE STRUCTURAL FLAGS ★★★
    console.log(`   Processing ${categorized.structuralFlags.length} structural flags...`);
    // Use flow-risk analysis to enhance structural flags with sentence numbers
    const baseStructuralFlags = categorized.structuralFlags.map(flag => ({
      phrase: flag.phrase,
      severity: flag.severity,
      explanation: flag.explanation,
      alternatives: flag.alternatives || []
    }));
    const enhancedStructuralFlags = enhanceStructuralFlags(baseStructuralFlags, essay);

    // ★★★ CALCULATE METRICS ★★★
    const totalFlags = result.flags.length;
    // FIXED: timeEstimate was removed when we simplified flags, so calculate quickWins differently
    // Quick wins are single-word flags (easier to fix)
    const quickWins = enhancedTextFlags.filter(f => {
      if (!f || !f.phrase) return false;
      const wordCount = f.phrase.split(' ').filter(w => w.trim().length > 0).length;
      return wordCount === 1; // Single word = quick win
    }).length;
    
    const estimatedTotalTime = Math.max(
      1,
      Math.ceil((totalFlags * 0.5) + (enhancedStructuralFlags.length * 2))
    );

    const calculateExpectedScore = () => {
      const highFlags = result.flags.filter(f => f.severity === 'high').length;
      const mediumFlags = result.flags.filter(f => f.severity === 'medium').length;
      const lowFlags = result.flags.filter(f => f.severity === 'low').length;
      
      const reduction = Math.min(
        40,
        (highFlags * 10) + (mediumFlags * 6) + (lowFlags * 3)
      );
      
      return Math.max(0, result.score - reduction);
    };

    const expectedNewScore = calculateExpectedScore();

    // ★★★ GENERATE FIXED ESSAY FOR STEP 3 (PLAIN TEXT ONLY) ★★★
    // Apply best fixes automatically to create a preview fixed essay
    let fixedEssayPlainText = essay;
    const step3Flags = [];
    
    // Apply fixes from text phrase flags (use best alternative)
    // Sort by position to avoid nested replacements
    const sortedFlags = [...enhancedTextFlags]
      .filter(flag => flag.phrase && flag.bestFix && flag.bestFix !== 'Rephrase naturally')
      .map(flag => ({
        ...flag,
        position: essay.toLowerCase().indexOf(flag.phrase.toLowerCase())
      }))
      .filter(flag => flag.position !== -1)
      .sort((a, b) => a.position - b.position);
    
    sortedFlags.forEach(flag => {
      const escapedPhrase = flag.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
      
      // Replace first occurrence only
      const beforeReplace = fixedEssayPlainText;
      let didReplace = false;
      
      fixedEssayPlainText = fixedEssayPlainText.replace(regex, (match) => {
        if (!didReplace) {
          didReplace = true;
          // Preserve capitalization
          const wasCapitalized = match[0] === match[0].toUpperCase();
          let replacement = flag.bestFix;
          if (wasCapitalized && replacement.length > 0) {
            replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
          }
          return replacement;
        }
        return match; // Keep other occurrences unchanged
      });
      
      // Only add to flags if replacement actually happened
      if (didReplace && beforeReplace !== fixedEssayPlainText) {
        step3Flags.push({
          original: flag.phrase,
          replacement: flag.bestFix,
          severity: flag.severity
        });
      }
    });

    // ★★★ FINAL RESPONSE ★★★
    // Ensure score is a number, not undefined
    const finalScore = typeof result.score === 'number' ? result.score : 0;
    
    // Calculate Step 3 metrics
    const beforeScore = finalScore;
    const afterScore = expectedNewScore;
    const textRisk = afterScore; // Text risk is the after score
    const falseFlowRisk = beforeScore <= 30 ? 'Low' : beforeScore <= 70 ? 'Medium' : 'High';
    
    // OPTIMIZED: Minimal response to prevent browser crashes
    // Removed: actionPlan, smartSort, issues, quickActions, overview, categorized, etc.
    // Enhance flags with context-aware analysis
    const flowRiskSummary = getFlowRiskSummary(enhancedStructuralFlags);
    
    const response = {
      score: finalScore,
      verdict: result.verdict || 'You\'re Good',
      confidence: result.confidence || 50,
      textPhraseFlags: enhancedTextFlags.map(flag => ({
        phrase: flag.phrase,
        severity: flag.severity,
        explanation: flag.explanation,
        alternatives: flag.alternatives || [],
        contextualReplacements: flag.contextualReplacements || []
      })),
      structuralFlags: enhancedStructuralFlags,
      flowRiskSummary: flowRiskSummary,
      fixedEssay: fixedEssayPlainText,
      beforeScore: beforeScore,
      afterScore: afterScore
    };

    // DEBUG: Check score before sending
    const responseSize = JSON.stringify(response).length;
    console.log('📊 RESPONSE SCORE:', response.score);
    console.log('📊 FULL RESULT:', {
      score: result.score,
      verdict: result.verdict,
      flagsCount: result.flags?.length,
      textPhraseFlags: response.textPhraseFlags.length,
      structuralFlags: response.structuralFlags.length,
      responseSizeKB: Math.round(responseSize / 1024) + ' KB'
    });
    console.log(`✅ Analysis complete: Score=${response.score}% (${response.verdict}), TextFlags=${response.textPhraseFlags.length}, StructuralFlags=${response.structuralFlags.length}, ResponseSize=${Math.round(responseSize / 1024)}KB`);
    
    // Memory tracking
    const memAfter = process.memoryUsage();
    const memDiff = {
      heapUsed: Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024) + ' MB',
      heapTotal: Math.round((memAfter.heapTotal - memBefore.heapTotal) / 1024 / 1024) + ' MB'
    };
    console.log('📊 Memory AFTER request:', {
      heapUsed: Math.round(memAfter.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memAfter.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memAfter.external / 1024 / 1024) + ' MB',
      change: memDiff
    });
    
    // Warn if memory increased significantly
    if (memAfter.heapUsed - memBefore.heapUsed > 50 * 1024 * 1024) {
      console.warn('⚠️ MEMORY WARNING: Heap increased by more than 50MB in this request!');
    }

    // Clear timeout on success
    clearTimeout(timeout);
    res.json(response);
  } catch (error) {
    console.error('❌ Server error:', error);
    clearTimeout(timeout);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  }
});

/**
 * QUICKFIX ENDPOINT - Simple phrase replacement only
 * No AI rewriting, just direct word/phrase swaps + re-analysis with Haiku
 */
async function applyQuickFix(essay, flags, originalScore, shouldForce = false) {
  let cleanedEssay = essay;
  const replacements = [];

  console.log(`🔧 QuickFix starting: ${flags.length} flags, original score: ${originalScore}%`);
  
  if (!flags || flags.length === 0) {
    const emptyScore = originalScore || 0;
    return {
      cleanedEssay: essay,
      newScore: emptyScore, // Keep for backward compatibility
      textPhraseScore: emptyScore,
      structuralScore: emptyScore,
      overallScore: emptyScore,
      originalScore: emptyScore,
      replacements: [],
      passes: 0,
      improvement: 0,
      forced: false,
      textPhraseFlags: [],
      structuralFlags: [],
      allFlags: []
    };
  }

  // CRITICAL: Sort by position in text (earliest first) then by length (longest first)
  // This prevents replacing parts of phrases before the full phrase
  const sortedFlags = [...flags]
    .map(flag => ({
      ...flag,
      position: essay.toLowerCase().indexOf(flag.phrase.toLowerCase())
    }))
    .filter(flag => flag.position !== -1) // Only keep flags that exist in text
    .sort((a, b) => {
      // Sort by position first (earliest first)
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      // If same position, sort by length (longest first)
      return (b.phrase?.length || 0) - (a.phrase?.length || 0);
    });

  console.log(`📝 Processing ${sortedFlags.length} flags in text order`);

  // Apply replacements ONE AT A TIME, from START TO END of text
  sortedFlags.forEach((flag, index) => {
    if (!flag.phrase || !flag.suggestedFix) return;
    
    // Escape special regex characters
    const escapedPhrase = flag.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Check if phrase still exists in current version of text
    // (might have been removed by previous replacement)
    if (!cleanedEssay.toLowerCase().includes(flag.phrase.toLowerCase())) {
      console.log(`   ⚠️ Phrase "${flag.phrase}" no longer in text, skipping`);
      return;
    }
    
    const hasSpace = flag.phrase.includes(' ');
    let didReplace = false;
    
    if (hasSpace) {
      // Multi-word phrase: match with word boundaries
      // Use non-capturing group to avoid including prefix in match
      const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
      
      const beforeReplace = cleanedEssay;
      cleanedEssay = cleanedEssay.replace(regex, (match) => {
        if (!didReplace) { // Only replace FIRST occurrence
          didReplace = true;
          
          // Preserve capitalization of first letter
          const wasCapitalized = match[0] === match[0].toUpperCase();
          let replacement = flag.suggestedFix;
          
          if (wasCapitalized && replacement.length > 0) {
            replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
          }
          
          console.log(`   ✓ [${index + 1}/${sortedFlags.length}] "${match}" → "${replacement}"`);
          return replacement;
        }
        return match; // Keep other occurrences unchanged for now
      });
      
      if (beforeReplace === cleanedEssay) {
        console.log(`   ⚠️ No match found for "${flag.phrase}"`);
      }
    } else {
      // Single word: use word boundaries
      const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
      
      const beforeReplace = cleanedEssay;
      cleanedEssay = cleanedEssay.replace(regex, (match) => {
        if (!didReplace) { // Only replace FIRST occurrence
          didReplace = true;
          
          const wasCapitalized = match[0] === match[0].toUpperCase();
          let replacement = flag.suggestedFix;
          
          if (wasCapitalized && replacement.length > 0) {
            replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
          }
          
          console.log(`   ✓ [${index + 1}/${sortedFlags.length}] "${match}" → "${replacement}"`);
          return replacement;
        }
        return match;
      });
      
      if (beforeReplace === cleanedEssay) {
        console.log(`   ⚠️ No match found for "${flag.phrase}"`);
      }
    }

    if (didReplace) {
      replacements.push({
        from: flag.phrase,
        to: flag.suggestedFix,
        pass: 1
      });
    }
  });

  // Apply contractions automatically
  HUMANIZATION_FIXES.contractions.forEach(fix => {
    const regex = new RegExp(fix.from, 'gi');
    let count = 0;
    cleanedEssay = cleanedEssay.replace(regex, () => {
      count++;
      return fix.to;
    });
    if (count > 0) {
      replacements.push({
        from: fix.from.trim(),
        to: fix.to.trim(),
        pass: 1,
        count: count,
        type: 'contraction'
      });
    }
  });

  console.log(`✅ Applied ${replacements.length} replacements`);
  console.log(`📄 Fixed text length: ${cleanedEssay.length} chars (original: ${essay.length})`);

  // Helper function to identify structural flags
  const isStructuralFlag = (flag, text) => {
    if (!flag || !flag.phrase) return false;
    
    const phrase = flag.phrase.toLowerCase();
    const lowerText = text.toLowerCase();
    const position = lowerText.indexOf(phrase);
    
    // If phrase doesn't appear in text, it's structural
    if (position === -1) return true;
    
    // Check for structural keywords in phrase, reason, or explanation
    const structuralKeywords = [
      'structural', 'pattern', 'contraction', 'sentence length', 
      'overall writing', 'grammar', 'formal', 'tone', 'style',
      'personal voice', 'uniform', 'repetitive'
    ];
    
    const combinedText = `${phrase} ${flag.reason || ''} ${flag.explanation || ''}`.toLowerCase();
    return structuralKeywords.some(keyword => combinedText.includes(keyword));
  };

  // Categorize original flags (before fixes)
  const originalTextPhraseFlags = flags.filter(flag => !isStructuralFlag(flag, essay));
  const originalStructuralFlags = flags.filter(flag => isStructuralFlag(flag, essay));
  
  console.log(`📊 Original flags: ${originalTextPhraseFlags.length} text phrase, ${originalStructuralFlags.length} structural`);

  // Re-analyze with Haiku
  console.log(`📊 Re-analyzing with Haiku...`);
  let finalAnalysis;
  try {
    finalAnalysis = await haikuDetector.analyzeEssay(cleanedEssay);
  } catch (error) {
    console.error('⚠️ Final analysis failed:', error.message);
    finalAnalysis = {
      score: Math.max(5, (originalScore || 100) - (replacements.length * 8)),
      flags: [],
      analysis: 'Score estimated based on replacements made'
    };
  }

  // Categorize final analysis flags
  const finalTextPhraseFlags = finalAnalysis.flags.filter(flag => !isStructuralFlag(flag, cleanedEssay));
  const finalStructuralFlags = finalAnalysis.flags.filter(flag => isStructuralFlag(flag, cleanedEssay));
  
  console.log(`📊 Final flags: ${finalTextPhraseFlags.length} text phrase, ${finalStructuralFlags.length} structural`);

  // Calculate separate scores based on remaining flags in each category
  // Score calculation: more flags = higher score
  const calculateScoreFromFlags = (flags, baseScore) => {
    if (!flags || flags.length === 0) return Math.max(0, baseScore - 20); // No flags = lower score
    
    const highSeverityCount = flags.filter(f => f.severity === 'high').length;
    const mediumSeverityCount = flags.filter(f => f.severity === 'medium').length;
    const lowSeverityCount = flags.filter(f => f.severity === 'low' || !f.severity).length;
    
    // Weighted score calculation
    const flagScore = (highSeverityCount * 15) + (mediumSeverityCount * 10) + (lowSeverityCount * 5);
    return Math.min(100, Math.max(0, baseScore - 20 + flagScore));
  };

  // Calculate text phrase score (based on remaining text phrase flags)
  const textPhraseScore = calculateScoreFromFlags(finalTextPhraseFlags, finalAnalysis.score);
  
  // Calculate structural score (based on remaining structural flags)
  const structuralScore = calculateScoreFromFlags(finalStructuralFlags, finalAnalysis.score);
  
  // Overall score is the combined score from Haiku
  let overallScore = finalAnalysis.score;
  let forced = false;

  if (shouldForce && overallScore >= 30) {
    console.warn(`⚠️ Score still ${overallScore}% - forcing to 25%`);
    overallScore = 25;
    forced = true;
  }

  console.log(`✅ QuickFix complete: ${originalScore}% → ${overallScore}%`);
  console.log(`📊 Separate scores: Text Phrases: ${textPhraseScore}%, Structure: ${structuralScore}%, Overall: ${overallScore}%`);

  return {
    cleanedEssay,
    newScore: overallScore, // Keep for backward compatibility
    textPhraseScore: Math.round(textPhraseScore),
    structuralScore: Math.round(structuralScore),
    overallScore: Math.round(overallScore),
    originalScore: originalScore || 100,
    replacements,
    passes: 1,
    improvement: (originalScore || 100) - overallScore,
    forced: forced,
    // Separate flag arrays for frontend
    textPhraseFlags: finalTextPhraseFlags,
    structuralFlags: finalStructuralFlags,
    allFlags: finalAnalysis.flags // Keep all flags for reference
  };
}

app.post('/quickfix', async (req, res) => {
  try {
    const { essay, flags, originalScore, shouldForce = false } = req.body;
    
    if (!essay || !Array.isArray(flags)) {
      return res.status(400).json({ 
        error: 'Invalid request. Expected { essay: string, flags: array }' 
      });
    }

    console.log(`🔧 QuickFix requested for essay with ${flags.length} flags`);

    // Use the applyQuickFix function - it does everything
    const result = await applyQuickFix(essay, flags, originalScore, shouldForce);

    console.log(`✅ QuickFix complete: ${result.originalScore}% → ${result.newScore}%`);

    res.json(result);
  } catch (error) {
    console.error('❌ QuickFix error:', error);
    res.status(500).json({
      error: 'QuickFix failed',
      message: error.message
    });
  }
});

// SEARCH SYNONYMS ENDPOINT - Uses Claude to find additional word alternatives
app.post('/api/search-synonyms', async (req, res) => {
  try {
    const { word, context } = req.body;
    
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request. Expected { word: string, context?: string }' 
      });
    }

    console.log(`🔍 Searching synonyms for: "${word}"${context ? ` (context: ${context})` : ''}`);

    // Check if we have API key (dummy mode fallback)
    if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.includes('your-full-key-here')) {
      console.warn('⚠️ API key not configured - using local synonym database fallback');
      
      // Fallback to local synonym database
      const { getReplacements } = await import('./lib/synonym-database.js');
      const wordLower = word.toLowerCase();
      
      // Try different contexts to find synonyms
      const contexts = ['general', 'formal', 'casual', 'formal_positive', 'formal_negative'];
      let synonyms = [];
      
      for (const ctx of contexts) {
        const replacements = getReplacements(wordLower, ctx);
        if (replacements && replacements.length > 0) {
          synonyms = replacements.map(r => typeof r === 'string' ? r : r.word);
          break;
        }
      }
      
      // If still no synonyms, try common variations
      if (synonyms.length === 0) {
        // Simple fallback synonyms for common words
        const commonSynonyms = {
          'furthermore': ['also', 'moreover', 'additionally', 'besides', 'plus'],
          'moreover': ['furthermore', 'also', 'additionally', 'besides', 'plus'],
          'leverage': ['use', 'utilize', 'employ', 'take advantage of', 'harness'],
          'utilize': ['use', 'employ', 'apply', 'make use of', 'harness'],
          'therefore': ['so', 'thus', 'hence', 'consequently', 'as a result'],
          'consequently': ['therefore', 'thus', 'so', 'as a result', 'hence']
        };
        
        synonyms = commonSynonyms[wordLower] || [];
      }
      
      const finalSynonyms = synonyms.slice(0, 8).filter(s => s && s.length > 0);
      
      console.log(`✅ Found ${finalSynonyms.length} synonyms from local database for "${word}"`);
      return res.json({ synonyms: finalSynonyms });
    }

    // Use Claude Haiku to find synonyms
    const prompt = `Find 5-8 natural, conversational synonyms or alternative phrases for the word/phrase "${word}" that would work well in academic or professional writing.

Context: ${context || 'General use'}
Focus on alternatives that sound natural and human-written, avoiding overly formal or AI-sounding language.

Return ONLY a JSON array of strings, like: ["alternative1", "alternative2", "alternative3"]
Do not include explanations or other text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ Claude API error, falling back to local database:', errorData.error?.message || 'Unknown error');
      
      // Fallback to local synonym database on API error
      const { getReplacements } = await import('./lib/synonym-database.js');
      const wordLower = word.toLowerCase();
      
      // Try different contexts to find synonyms
      const contexts = ['general', 'formal', 'casual', 'formal_positive', 'formal_negative'];
      let synonyms = [];
      
      for (const ctx of contexts) {
        const replacements = getReplacements(wordLower, ctx);
        if (replacements && replacements.length > 0) {
          synonyms = replacements.map(r => typeof r === 'string' ? r : r.word);
          break;
        }
      }
      
      // If still no synonyms, try common variations
      if (synonyms.length === 0) {
        const commonSynonyms = {
          'furthermore': ['also', 'moreover', 'additionally', 'besides', 'plus'],
          'moreover': ['furthermore', 'also', 'additionally', 'besides', 'plus'],
          'leverage': ['use', 'utilize', 'employ', 'take advantage of', 'harness'],
          'utilize': ['use', 'employ', 'apply', 'make use of', 'harness'],
          'therefore': ['so', 'thus', 'hence', 'consequently', 'as a result'],
          'consequently': ['therefore', 'thus', 'so', 'as a result', 'hence']
        };
        
        synonyms = commonSynonyms[wordLower] || [];
      }
      
      const finalSynonyms = synonyms.slice(0, 8).filter(s => s && s.length > 0);
      
      console.log(`✅ Found ${finalSynonyms.length} synonyms from local database (fallback) for "${word}"`);
      return res.json({ synonyms: finalSynonyms });
    }

    const data = await response.json();
    const responseText = data.content[0].text.trim();
    
    // Try to parse JSON from response
    let synonyms = [];
    try {
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        synonyms = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by lines or commas
        synonyms = responseText.split(/[,\n]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(s => s.length > 0);
      }
    } catch (e) {
      console.warn('Failed to parse synonyms JSON, using fallback:', e);
      // Fallback: try to extract words from text
      synonyms = responseText.split(/[,\n]/).map(s => s.trim().replace(/^["'\-•\d\.]|["']$/g, '')).filter(s => s.length > 0 && s.length < 50);
    }

    // Limit to 8 results and filter out empty/invalid entries
    synonyms = synonyms.slice(0, 8).filter(s => s && s.length > 0 && s.length < 100);

    console.log(`✅ Found ${synonyms.length} synonyms for "${word}"`);

    res.json({ synonyms });
  } catch (error) {
    console.error('❌ Search synonyms error:', error);
    
    // Final fallback: try local database
    try {
      const { getReplacements } = await import('./lib/synonym-database.js');
      const wordLower = word.toLowerCase();
      
      // Try different contexts to find synonyms
      const contexts = ['general', 'formal', 'casual', 'formal_positive', 'formal_negative'];
      let synonyms = [];
      
      for (const ctx of contexts) {
        const replacements = getReplacements(wordLower, ctx);
        if (replacements && replacements.length > 0) {
          synonyms = replacements.map(r => typeof r === 'string' ? r : r.word);
          break;
        }
      }
      
      // If still no synonyms, try common variations
      if (synonyms.length === 0) {
        const commonSynonyms = {
          'furthermore': ['also', 'moreover', 'additionally', 'besides', 'plus'],
          'moreover': ['furthermore', 'also', 'additionally', 'besides', 'plus'],
          'leverage': ['use', 'utilize', 'employ', 'take advantage of', 'harness'],
          'utilize': ['use', 'employ', 'apply', 'make use of', 'harness'],
          'therefore': ['so', 'thus', 'hence', 'consequently', 'as a result'],
          'consequently': ['therefore', 'thus', 'so', 'as a result', 'hence']
        };
        
        synonyms = commonSynonyms[wordLower] || [];
      }
      
      const finalSynonyms = synonyms.slice(0, 8).filter(s => s && s.length > 0);
      
      console.log(`✅ Found ${finalSynonyms.length} synonyms from local database (error fallback) for "${word}"`);
      return res.json({ synonyms: finalSynonyms });
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      res.status(500).json({
        error: 'Search failed',
        message: error.message,
        synonyms: [] // Return empty array on error
      });
    }
  }
});
app.get("/", (req, res) => {
  res.send("DTIIY / False Flag Fixer API is live");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  🚀 FALSE FLAG FIXER API - ULTRA AGGRESSIVE v4.0 - READY!     ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                             ║
║  Model: Claude Haiku 4.5 (claude-haiku-4-5-20251001)         ║
║  Mode: ULTRA AGGRESSIVE - Finds EVERYTHING                    ║
║  Database: 100+ AI trigger words/phrases                      ║
║  Strategy: Haiku + Pattern detection + Missed pattern scan    ║
║  💰 TIER-BASED: Free = Local (no cost), Pro = Haiku API      ║
║  API Key: ${ANTHROPIC_API_KEY.substring(0, 10)}...            ║
║  🔍 Synonym Search: POST /api/search-synonyms                 ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  console.log('✅ API Endpoints registered:');
  console.log('   POST /api/search-synonyms - Search for word synonyms');
  console.log('   POST /analyze - Analyze essay');
  console.log('   POST /quickfix - Apply QuickFixes');
});
