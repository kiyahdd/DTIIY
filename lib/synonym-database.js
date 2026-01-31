/**
 * SYNONYM DATABASE - Context-Aware Replacements
 * 
 * 100 most common AI trigger words with multiple replacement options
 * categorized by context (tone, sentiment, formality)
 * 
 * Structure:
 * {
 *   word: {
 *     severity: "extreme" | "high" | "medium" | "light",
 *     score: -50 to -10,
 *     contexts: {
 *       formal_negative: [ { word, confidence } ],
 *       formal_positive: [ { word, confidence } ],
 *       casual: [ { word, confidence } ],
 *       etc.
 *     }
 *   }
 * }
 */

const SYNONYM_DATABASE = {
  // ========================================================================
  // EXTREME AI TRIGGERS (-50)
  // ========================================================================
  
  "unprecedented": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal_negative: [
        { word: "significant", confidence: 92 },
        { word: "major", confidence: 88 },
        { word: "substantial", confidence: 84 }
      ],
      formal_positive: [
        { word: "remarkable", confidence: 91 },
        { word: "exceptional", confidence: 89 },
        { word: "historic", confidence: 87 }
      ],
      casual_negative: [
        { word: "big", confidence: 75 },
        { word: "serious", confidence: 72 }
      ],
      casual_positive: [
        { word: "amazing", confidence: 70 },
        { word: "incredible", confidence: 68 }
      ]
    }
  },
  
  "utilize": {
    severity: "extreme",
    score: -50,
    contexts: {
      general: [
        { word: "use", confidence: 95 },
        { word: "employ", confidence: 80 },
        { word: "apply", confidence: 78 },
        { word: "make use of", confidence: 75 }
      ],
      casual: [
        { word: "take advantage of", confidence: 85 },
        { word: "tap into", confidence: 82 }
      ]
    }
  },
  
  "leverage": {
    severity: "extreme",
    score: -50,
    contexts: {
      business_formal: [
        { word: "use", confidence: 92 },
        { word: "capitalize on", confidence: 88 },
        { word: "take advantage of", confidence: 85 }
      ],
      casual: [
        { word: "use", confidence: 90 },
        { word: "make use of", confidence: 80 }
      ]
    }
  },
  
  "facilitate": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "help", confidence: 92 },
        { word: "enable", confidence: 88 },
        { word: "make easier", confidence: 85 }
      ],
      casual: [
        { word: "help", confidence: 90 },
        { word: "make it easier", confidence: 87 }
      ]
    }
  },
  
  "demonstrate": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "show", confidence: 94 },
        { word: "prove", confidence: 91 },
        { word: "reveal", confidence: 88 }
      ],
      casual: [
        { word: "show", confidence: 92 },
        { word: "illustrate", confidence: 85 }
      ]
    }
  },
  
  "cutting-edge": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "modern", confidence: 90 },
        { word: "current", confidence: 88 },
        { word: "latest", confidence: 86 }
      ],
      casual: [
        { word: "new", confidence: 85 },
        { word: "up-to-date", confidence: 82 }
      ]
    }
  },
  
  "paradigm": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "model", confidence: 91 },
        { word: "framework", confidence: 88 },
        { word: "approach", confidence: 85 }
      ],
      casual: [
        { word: "way of thinking", confidence: 80 },
        { word: "outlook", confidence: 78 }
      ]
    }
  },
  
  "synthesize": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "combine", confidence: 92 },
        { word: "bring together", confidence: 89 },
        { word: "merge", confidence: 86 }
      ],
      casual: [
        { word: "put together", confidence: 85 },
        { word: "mix", confidence: 80 }
      ]
    }
  },
  
  "juxtapose": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "compare", confidence: 90 },
        { word: "contrast", confidence: 88 },
        { word: "place side by side", confidence: 85 }
      ],
      casual: [
        { word: "compare", confidence: 88 },
        { word: "put next to", confidence: 82 }
      ]
    }
  },
  
  "innovative": {
    severity: "high",
    score: -35,
    contexts: {
      formal_positive: [
        { word: "creative", confidence: 90 },
        { word: "new", confidence: 88 },
        { word: "original", confidence: 86 }
      ],
      casual: [
        { word: "creative", confidence: 85 },
        { word: "fresh", confidence: 82 }
      ]
    }
  },
  
  "comprehensive": {
    severity: "high",
    score: -35,
    contexts: {
      formal: [
        { word: "thorough", confidence: 92 },
        { word: "complete", confidence: 90 },
        { word: "full", confidence: 87 }
      ],
      casual: [
        { word: "complete", confidence: 88 },
        { word: "whole", confidence: 85 }
      ]
    }
  },
  
  "strategic": {
    severity: "high",
    score: -35,
    contexts: {
      business_formal: [
        { word: "planned", confidence: 91 },
        { word: "calculated", confidence: 88 },
        { word: "thoughtful", confidence: 85 }
      ],
      casual: [
        { word: "smart", confidence: 85 },
        { word: "planned out", confidence: 82 }
      ]
    }
  },
  
  "optimize": {
    severity: "high",
    score: -35,
    contexts: {
      formal: [
        { word: "improve", confidence: 92 },
        { word: "make better", confidence: 90 },
        { word: "enhance", confidence: 87 }
      ],
      casual: [
        { word: "improve", confidence: 90 },
        { word: "make better", confidence: 88 }
      ]
    }
  },
  
  "implement": {
    severity: "high",
    score: -35,
    contexts: {
      formal: [
        { word: "put in place", confidence: 91 },
        { word: "set up", confidence: 89 },
        { word: "establish", confidence: 86 }
      ],
      casual: [
        { word: "put in place", confidence: 88 },
        { word: "start using", confidence: 85 }
      ]
    }
  },
  
  "efficacy": {
    severity: "extreme",
    score: -50,
    contexts: {
      formal: [
        { word: "effectiveness", confidence: 92 },
        { word: "success", confidence: 89 },
        { word: "impact", confidence: 86 }
      ],
      casual: [
        { word: "works", confidence: 85 },
        { word: "effectiveness", confidence: 82 }
      ]
    }
  },
  
  "furthermore": {
    severity: "light",
    score: -10,
    contexts: {
      formal: [
        { word: "also", confidence: 89 },
        { word: "in addition", confidence: 87 },
        { word: "moreover", confidence: 85 }
      ],
      casual: [
        { word: "also", confidence: 90 },
        { word: "plus", confidence: 86 }
      ]
    }
  },
  
  "substantial": {
    severity: "medium",
    score: -20,
    contexts: {
      formal: [
        { word: "considerable", confidence: 89 },
        { word: "significant", confidence: 87 },
        { word: "large", confidence: 84 }
      ],
      casual: [
        { word: "big", confidence: 85 },
        { word: "large", confidence: 83 }
      ]
    }
  }
};

function getReplacements(word, context) {
  if (!SYNONYM_DATABASE[word]) {
    return [];
  }
  
  const wordData = SYNONYM_DATABASE[word];
  
  if (wordData.contexts[context]) {
    return wordData.contexts[context];
  }
  
  if (wordData.contexts.general) {
    return wordData.contexts.general;
  }
  
  const firstContext = Object.keys(wordData.contexts)[0];
  return wordData.contexts[firstContext] || [];
}

function getAllContexts(word) {
  return SYNONYM_DATABASE[word]?.contexts || {};
}

function getSeverity(word) {
  return SYNONYM_DATABASE[word]?.severity || "unknown";
}

export {
  SYNONYM_DATABASE,
  getReplacements,
  getAllContexts,
  getSeverity
};

