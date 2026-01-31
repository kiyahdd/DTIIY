/**
 * CONTEXT-AWARE-REPLACEMENTS.js
 * 
 * Enhances existing text flags with context-aware replacement options.
 */

import { SYNONYM_DATABASE, getReplacements } from './synonym-database.js';

function detectContext(phrase, sentence) {
  const phraseLower = phrase.toLowerCase();
  const sentenceLower = sentence.toLowerCase();
  
  const position = sentenceLower.indexOf(phraseLower);
  if (position === -1) return 'general';
  
  const start = Math.max(0, position - 30);
  const end = Math.min(sentenceLower.length, position + phrase.length + 30);
  const context = sentenceLower.substring(start, end);
  
  const negativeWords = ['bad', 'problem', 'challenge', 'issue', 'difficult', 'struggle', 'fail', 'decline', 'harm'];
  const positiveWords = ['good', 'success', 'achieve', 'gain', 'improve', 'growth', 'benefit', 'great'];
  const formalWords = ['demonstrate', 'methodology', 'framework', 'analysis', 'implement', 'comprehensive'];
  const casualWords = ["don't", "i ", "we ", "you ", "can't", "won't"];
  
  const hasNegative = negativeWords.some(word => context.includes(word));
  const hasPositive = positiveWords.some(word => context.includes(word));
  const hasFormal = formalWords.some(word => context.includes(word));
  const hasCasual = casualWords.some(word => context.includes(word));
  
  if (hasFormal) {
    if (hasNegative) return 'formal_negative';
    if (hasPositive) return 'formal_positive';
    return 'formal';
  }
  
  return 'casual';
}

function getContextAwareReplacements(word, essay, sentence = null) {
  const wordLower = word.toLowerCase();
  
  if (!SYNONYM_DATABASE[wordLower]) {
    return [];
  }
  
  let context = 'general';
  if (sentence) {
    context = detectContext(word, sentence);
  } else {
    const essayLower = essay.toLowerCase();
    const idx = essayLower.indexOf(wordLower);
    if (idx !== -1) {
      const sentenceStart = Math.max(0, essay.lastIndexOf('.', idx) + 2);
      const sentenceEnd = essay.indexOf('.', idx) + 1;
      if (sentenceEnd > sentenceStart) {
        const foundSentence = essay.substring(sentenceStart, sentenceEnd);
        context = detectContext(word, foundSentence);
      }
    }
  }
  
  const replacements = getReplacements(wordLower, context);
  
  if (replacements.length === 0) {
    return getReplacements(wordLower, 'general') || [];
  }
  
  return replacements.map(repl => ({
    word: repl.word,
    confidence: repl.confidence || 80,
    reason: `Fits ${context.replace(/_/g, ' ')} context well`
  }));
}

function enhanceTextFlags(originalFlags, essay) {
  if (!originalFlags || originalFlags.length === 0) {
    return originalFlags;
  }
  
  return originalFlags.map(flag => {
    const enhancedFlag = { ...flag };
    
    if (!enhancedFlag.contextualReplacements) {
      const contextReplacements = getContextAwareReplacements(flag.phrase, essay);
      
      if (contextReplacements.length > 0) {
        enhancedFlag.contextualReplacements = contextReplacements;
        enhancedFlag.alternatives = contextReplacements.map(r => r.word);
        enhancedFlag.bestReplacement = contextReplacements[0];
      }
    }
    
    return enhancedFlag;
  });
}

export {
  detectContext,
  getContextAwareReplacements,
  enhanceTextFlags
};

