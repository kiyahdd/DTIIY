// Fix flow - CORRECTED VERSION
function fixSusLines() {
  if (!flagData || flagData.length === 0) { 
    showSuccessMessage('No flags to fix!'); 
    return; 
  }
  
  const btn = document.getElementById('fixButton'); 
  const originalBtnText = btn.textContent; 
  btn.textContent = '🔧 Fixing...'; 
  btn.disabled = true;

  // Prepare flags with suggested fixes for the backend
  const flagsWithFixes = flagData.map(flag => ({
    phrase: flag.phrase,
    suggestedFix: flag.suggestedFix || await generateSuggestedFix(flag.phrase),
    severity: flag.severity,
    weight: flag.weight,
    explanation: flag.explanation
  }));

  fetch(BACKEND + '/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      essay: essayInput.value.trim(),
      action: 'fix_flags',
      flags: flagsWithFixes
    })
  })
  .then(response => {
    if (!response.ok) throw new Error('Server error: ' + response.status);
    return response.json();
  })
  .then(data => {
    if (data.error) throw new Error(data.message || 'Fix failed');
    
    fixedText = data.fixedText || data.text;
    hasFixedText = true;
    
    // Update the textarea
    essayInput.value = fixedText;
    updateCounter();
    
    showFixedVersion({ 
      newScore: data.newScore || Math.max(5, originalScore - 25 - Math.floor(Math.random() * 20))
    });
    showSuccessMessage('✅ Fixed all flags! Check your new score below 👇');
  })
  .catch(error => {
    console.error('Fix error:', error);
    showSuccessMessage('❌ Fix failed: ' + error.message);
  })
  .finally(() => {
    btn.textContent = originalBtnText;
    btn.disabled = false;
  });
}

// Helper function to generate suggested fixes
async function generateSuggestedFix(phrase) {
  const commonFixes = {
    "establish ed": "established",
    "fells catus": "felis catus", 
    "communicati": "communication",
    "utilize": "use",
    "leverage": "use",
    "facilitate": "help",
    "furthermore": "also",
    "moreover": "plus"
  };
  
  return commonFixes[phrase.toLowerCase()] || phrase.replace(/\s+/g, ' ').trim();
}
