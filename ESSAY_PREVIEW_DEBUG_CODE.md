# Essay Preview Debug Code

Here are the key code sections that handle the essay preview display:

## 1. Where text is retrieved (Line 16664)
```javascript
const text = appState.originalText || '';
```

## 2. Where appState.originalText is set (Line 16374 - in scanEssay function)
```javascript
// Store the original text for later use in results (including essay preview box)
appState.originalText = text;
```

## 3. Essay Preview Element (Line 17931)
```javascript
const essaySnippetEl = document.getElementById('freeEssaySnippetText');
const essaySnippetContainer = document.getElementById('freeEssaySnippet');
```

## 4. For Clean Scores (< 30) - Lines 17971-18016
```javascript
if (score < 30) {
  console.log('📝 Clean score detected (< 30), showing text without blur');
  const essayText = text.trim();
  
  // Function to get first 5 sentences
  const getFirst5Sentences = (text) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const first5 = sentences.slice(0, 5).join(' ');
    return sentences.length > 5 ? first5 + '...' : first5;
  };
  
  // Function to set essay text with proper styling (limited to first 5 sentences)
  const setEssayText = (el) => {
    if (el && essayText) {
      const previewText = getFirst5Sentences(essayText);
      el.textContent = previewText;
      el.style.fontStyle = 'normal';
      el.style.color = '#374151';
      el.style.whiteSpace = 'pre-wrap';
      el.style.overflowWrap = 'break-word';
      el.style.wordWrap = 'break-word';
      console.log('✅ Essay text set on element:', el.id, 'Content length:', el.textContent.length, 'Preview:', el.textContent.substring(0, 50) + '...');
      return true;
    }
    return false;
  };
  
  // Set immediately if element exists
  if (essaySnippetEl) {
    setEssayText(essaySnippetEl);
  }
}
```

## 5. For Scores >= 30 - Lines 18045-18437
```javascript
else {
  // Limit to first 5 sentences before highlighting
  const getFirst5Sentences = (text) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const first5 = sentences.slice(0, 5).join(' ');
    return sentences.length > 5 ? first5 + '...' : first5;
  };
  
  // Highlight AI trigger words (limited to first 5 sentences)
  let highlightedText = getFirst5Sentences(text.trim());
  
  // ... highlighting logic ...
  
  // Set the HTML when we had text-phrase highlights
  if (textPhraseFlags.length > 0) {
    // ... set innerHTML with highlights ...
    essaySnippetEl.innerHTML = highlightedText;
  } else {
    // No text phrase flags - show user's actual text (first 5 sentences) without highlighting
    if (essaySnippetEl && text && text.trim().length > 0) {
      const getFirst5Sentences = (text) => {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const first5 = sentences.slice(0, 5).join(' ');
        return sentences.length > 5 ? first5 + '...' : first5;
      };
      const previewText = getFirst5Sentences(text.trim());
      essaySnippetEl.textContent = previewText;
      essaySnippetEl.setAttribute('data-use-innerhtml', 'false');
      console.log('✅ No text phrase flags: Set essay preview to user text (first 5 sentences)');
    }
  }
}
```

## Debug Checklist:

1. **Check if appState.originalText is set:**
   - Open browser console
   - Type: `appState.originalText`
   - Should show your essay text

2. **Check if text variable has value in showFreeUserResult:**
   - Add console.log at line 16664: `console.log('🔍 TEXT VALUE:', text, 'Length:', text.length);`

3. **Check if essaySnippetEl exists:**
   - Add console.log at line 17931: `console.log('🔍 ESSAY ELEMENT:', essaySnippetEl);`

4. **Check what's actually in the element:**
   - After the code runs, in console type: `document.getElementById('freeEssaySnippetText').textContent`

5. **Check if something is overwriting it later:**
   - Search for other places that set `freeEssaySnippetText` innerHTML/textContent







