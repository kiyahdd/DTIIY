/**
 * FLOW-RISK-ANALYSIS.js
 * 
 * Enhances structural flags with sentence numbering and detailed fixes.
 */

function parseSentences(essay) {
  if (!essay || essay.length === 0) return [];
  
  const sentences = [];
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  let match;
  let sentenceIndex = 1;
  
  while ((match = sentenceRegex.exec(essay)) !== null) {
    const sentence = match[0].trim();
    if (sentence.length > 0) {
      sentences.push({
        index: sentenceIndex,
        sentence: sentence,
        startPos: match.index,
        endPos: match.index + match[0].length
      });
      sentenceIndex++;
    }
  }
  
  return sentences;
}

function detectPassiveVoiceSentences(essay) {
  const sentences = parseSentences(essay);
  const problematicSentences = [];
  
  sentences.forEach(({ index, sentence }) => {
    const passivePatterns = [
      /\b(is|are|was|were)\s+\w+ed\b/gi,
      /\b(has|have|had)\s+been\b/gi,
      /\b(will|would|should|could)\s+be\b/gi
    ];
    
    let passiveCount = 0;
    passivePatterns.forEach(pattern => {
      const matches = sentence.match(pattern);
      if (matches) {
        passiveCount += matches.length;
      }
    });
    
    const words = sentence.split(/\s+/).length;
    const passivePercentage = (passiveCount / words) * 100;
    
    if (passivePercentage > 35) {
      problematicSentences.push({
        sentenceIndex: index,
        sentence: sentence,
        issue: 'passive_voice',
        percentage: passivePercentage.toFixed(1),
        severity: passivePercentage > 60 ? 'high' : 'medium'
      });
    }
  });
  
  return problematicSentences;
}

function detectUniformLengthSentences(essay) {
  const sentences = parseSentences(essay);
  
  if (sentences.length < 3) return [];
  
  const wordCounts = sentences.map(s => ({
    index: s.index,
    sentence: s.sentence,
    wordCount: s.sentence.split(/\s+/).length
  }));
  
  const counts = wordCounts.map(s => s.wordCount);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;
  
  if (cv < 15) {
    const avgLength = mean;
    const problematic = wordCounts
      .filter(s => Math.abs(s.wordCount - avgLength) < 3)
      .slice(0, 3);
    
    return problematic.map(s => ({
      sentenceIndex: s.index,
      sentence: s.sentence,
      issue: 'uniform_length',
      wordCount: s.wordCount,
      averageLength: mean.toFixed(1),
      variation: cv.toFixed(1),
      severity: cv < 10 ? 'high' : 'medium'
    }));
  }
  
  return [];
}

function enhanceStructuralFlags(originalFlags, essay) {
  if (!originalFlags || originalFlags.length === 0) {
    return originalFlags;
  }
  
  const passiveVoiceIssues = detectPassiveVoiceSentences(essay);
  const uniformLengthIssues = detectUniformLengthSentences(essay);
  
  const allIssues = [...passiveVoiceIssues, ...uniformLengthIssues];
  
  return originalFlags.map(flag => {
    const enhanced = { ...flag };
    
    const matchingIssues = allIssues.filter(issue => {
      const flagPhraseLower = flag.phrase.toLowerCase();
      
      if (issue.issue === 'passive_voice' && flagPhraseLower.includes('passive')) {
        return true;
      }
      if (issue.issue === 'uniform_length' && flagPhraseLower.includes('uniform')) {
        return true;
      }
      
      return false;
    });
    
    if (matchingIssues.length > 0) {
      enhanced.affectedSentences = matchingIssues.map(issue => ({
        sentenceNumber: issue.sentenceIndex,
        sentence: issue.sentence,
        details: issue
      }));
      
      if (matchingIssues[0].issue === 'passive_voice') {
        enhanced.fixSuggestion = `Rewrite sentences [${matchingIssues.map(i => i.sentenceIndex).join(', ')}] to use active voice`;
      } else if (matchingIssues[0].issue === 'uniform_length') {
        enhanced.fixSuggestion = `Add shorter (5-10 word) or longer (25+ word) sentences to vary rhythm`;
      }
    }
    
    return enhanced;
  });
}

function getFlowRiskSummary(enhancedFlags) {
  const summary = {
    totalIssues: 0,
    sentencesWithIssues: [],
    issuesByType: {}
  };
  
  enhancedFlags.forEach(flag => {
    if (flag.affectedSentences && flag.affectedSentences.length > 0) {
      summary.totalIssues += flag.affectedSentences.length;
      
      flag.affectedSentences.forEach(issue => {
        if (!summary.sentencesWithIssues.includes(issue.sentenceNumber)) {
          summary.sentencesWithIssues.push(issue.sentenceNumber);
        }
        
        const issueType = issue.details.issue || 'unknown';
        if (!summary.issuesByType[issueType]) {
          summary.issuesByType[issueType] = [];
        }
        summary.issuesByType[issueType].push(issue.sentenceNumber);
      });
    }
  });
  
  summary.sentencesWithIssues.sort((a, b) => a - b);
  
  return summary;
}

export {
  parseSentences,
  detectPassiveVoiceSentences,
  detectUniformLengthSentences,
  enhanceStructuralFlags,
  getFlowRiskSummary
};

