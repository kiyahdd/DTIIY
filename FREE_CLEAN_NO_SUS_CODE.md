# Free Clean No Sus Page Code

This document contains all the code sections that render the Free Clean No Sus page (score < 30).

## 1. HTML Structure - Main Card (`youreGoodCard`)

**Location: Lines 5665-5775**

```html
<!-- CARD 1: YOU'RE GOOD VERSION (0-29%) -->
<div id="youreGoodCard" class="card warning-card" style="padding: 0; overflow: visible; position: relative; display: none;">
  <button onclick="minimizeResults()" style="position: absolute; top: 12px; right: 15px; background: none; border: none; font-size: 20px; color: #d1fae5; cursor: pointer; z-index: 2;">×</button>

  <!-- Your AI Sus Score Title - ABOVE THE BOX -->
  <div style="text-align: center; margin: 0 20px 24px 20px; position: relative; z-index: 10; padding-top: 20px;">
    <h3 style="font-size: 24px; font-weight: 700; color: #374151; margin: 0 0 8px 0; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Your AI Sus Score</h3>
    <p style="font-size: 14px; font-weight: 400; color: #6b7280; margin: 0; text-align: center; line-height: 1.4;">How suspicious your writing looks to AI detectors — even though it's 100% human 🙄</p>
  </div>

  <!-- HEADER SECTION - NEW STYLE -->
  <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin: 20px; border-left: 8px solid #2ecc71; border-right: 8px solid #2ecc71;">
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
      <div style="width: 60px; height: 60px; background: #d1fae5; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(46, 204, 113, 0.3); flex-shrink: 0;">
        <span style="font-size: 36px; line-height: 1;">✅</span>
      </div>
      <div style="text-align: center;">
        <h2 id="youreGoodWarningTitle" style="font-size: 32px; font-weight: 700; margin: 0; line-height: 1; color: #2ecc71;">Clean - No Sus</h2>
        <p id="youreGoodLabel" style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-top: 6px;">No AI-trigger words detected</p>
      </div>
    </div>
  </div>

  <!-- WHITE SCORE / BAR SECTION -->
  <div style="background: #ffffff; padding: 24px 28px 22px 28px; text-align: center;">
    <p id="youreGoodDetectorMessage" style="font-size:24px;font-weight:700;color:#ffffff;margin:0 0 48px 0;background:#2ecc71;padding:12px 24px;border-radius:10px;text-align:center;">
      Your professor's AI detector won't flag this →
    </p>
    
    <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
      <span id="youreGoodScoreNumber" style="font-size: 40px; font-weight: 900; color: #2ecc71;">18%</span>
      <span id="youreGoodScoreLabel" style="font-size: 20px; font-weight: 700; color: #2ecc71;">Clean - No Sus</span>
      <span id="youreGoodScoreEmoji" style="font-size: 34px;">✅</span>
    </div>

    <div class="progress-container" style="margin: 0 0 10px 0;">
      <div id="youreGoodProgressBar" class="progress-bar" style="height: 8px; background: #e5e7eb; border-radius: 4px; position: relative; overflow: visible; border: 1px solid #ccc;">
        <div class="progress-fill" id="youreGoodProgressFill" style="overflow: hidden; border-radius: 4px;"></div>
        <div class="progress-indicator" id="youreGoodProgressIndicator"></div>
      </div>
      <div class="progress-endpoints">
        <span>0%</span>
        <span>100%</span>
      </div>
      <div class="progress-labels">
        <span>✅ Clean - No Sus</span>
        <span>⚠️ Kinda Sus</span>
        <span>🚨 Hella Sus</span>
      </div>
    </div>
    
    <!-- Rotating phrases RIGHT AFTER progress bar -->
    <div class="rotating-message-container" style="display: none; margin: 20px 0;">
      <div class="rotating-message">✅ Clean as a whistle!</div>
      <div class="rotating-message">✨ Ready to turn it in</div>
      <div class="rotating-message">🎉 No AI flags detected</div>
    </div>
    <p id="youreGoodMessage" style="font-size: 18px; font-weight: 700; color: #374151; margin: 24px 0 0 0; text-align: center;">
      Your writing is literally immaculate ✨
    </p>
  </div>

  <!-- CONGRATULATORY MESSAGE FOR CLEAN/NO SUS -->
  <div style="background: #d1fae5; border-radius: 8px; padding: 24px; margin: 20px; text-align: center;">
    <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
    <h2 style="font-size: 28px; font-weight: 800; color: #047857; margin: 0 0 12px 0;">Vibe Check Passed!</h2>
    <p style="font-size: 18px; font-weight: 600; color: #065f46; margin: 0;">No AI-trigger words detected</p>
  </div>

  <!-- ESSAY PREVIEW -->
  <div id="essayPreviewContent" style="background: white; border-left: 4px solid #059669; border-right: 4px solid #059669; border-radius: 8px; padding: 20px; font-size: 14px; line-height: 1.8; color: #374151; min-height: 100px; margin: 20px; margin-top: 0;">
    <!-- Essay text will be inserted here -->
    <!-- FIRST 5 LINES OF ESSAY -->
    <div id="essayFirstLinesClean" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; line-height: 1.6; white-space: pre-wrap; overflow-wrap: break-word; word-wrap: break-word; display: none;"></div>
  </div>

  <!-- ROTATING SUCCESS MESSAGES -->
  <div id="rotatingCleanMessage" style="text-align: center; margin: 20px; padding: 16px; font-size: 20px; font-weight: 700; color: #1e3a8a; min-height: 30px; transition: opacity 0.5s ease-in-out;">
    <!-- Messages will rotate here -->
  </div>
  
  <!-- ESSAY PREVIEW (FREE Clean No Sus) - Exact copy from QuickFix Step 2 Clean No Sus - ABOVE GREEN BOX -->
  <div id="freeCleanNoSusEssayContainer" style="background:#f8f9fa; border-radius:12px; padding:20px 20px 10px 20px; margin:20px 0; display: none;">
    <!-- Heading for Clean No Sus -->
    <h3 style="text-align:center; color:#2ecc71; font-size:20px; font-weight:700; margin-top:10px; margin-bottom:8px;">
      ✅ Your Essay is Clean - No Sus!
    </h3>
    <p style="text-align:center; color:#6b7280; font-size:14px; margin-bottom:20px; font-weight:500;">
      No AI-trigger words detected. Your essay is ready to turn in!
    </p>
    
    <!-- Essay Content - Same structure as quickfixEssayContainer > flaggedEssayContent -->
    <div id="freeCleanNoSusEssayContent" class="essay-content" style="line-height:1.8; max-height: 400px; overflow-y: auto; overflow-x: auto; border: 1px solid #d1d5db; border-right: 4px solid #2ecc71; border-radius: 8px; padding: 20px; background: white; margin-top: 0; margin-bottom: 0; font-size: 16px; position: relative;">
      <!-- Essay content will be inserted here - same as flaggedEssayContent for Clean No Sus -->
    </div>
    
    <!-- Copy Text CTA for FREE Clean No Sus - Same as QuickFix -->
    <div id="freeCleanNoSusCopyTextCTA" style="display: none; text-align: center; margin: 0; padding: 24px 0 24px 0;">
      <button id="freeCleanNoSusCopyButton" onclick="copyFreeCleanNoSusResult()" style="background: #2ecc71 !important; color: white !important; border: 1px solid #2ecc71 !important; border-radius: 8px; padding: 12px 24px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; transition: all 0.2s; margin: 0;" onmouseover="this.style.background='#27ae60'; this.style.borderColor='#27ae60'; this.style.color='white';" onmouseout="this.style.background='#2ecc71'; this.style.borderColor='#2ecc71'; this.style.color='white';">
        ✅ Copy & Turn It In
      </button>
    </div>
  </div>
</div>
```

## 2. HTML Structure - Trigger Words Section

**Location: Lines 5850-5868**

```html
<!-- AI TRIGGER WORDS SECTION -->
<div id="freeTriggerWordsCard" class="card" style="padding: 20px; margin-bottom: 20px;">
  <!-- TRIGGER HEADING WITH BADGE COUNTS -->
  <p id="freeTriggerHeading" style="color: #0b0646; font-size: 24px; font-weight: 800; margin: 0 0 0px 0; padding-bottom: 0px; text-align: center;">
    <span id="freeTriggerHeadingText" style="font-size: 20px; font-weight: 800;">⚡ AI Trigger Words/Phrases: <span style="color: #dc2626; font-weight: 800;">0</span> Shown <span style="color: #dc2626; font-weight: 800;">0</span> Detected</span>
  </p>

  <!-- TRIGGER WORDS SUBTITLE -->
  <p id="freeTriggerWordsSubtitle" style="font-size: 14px; color: #6b7280; margin: 0 0 40px 0; line-height: 1.6; text-align: center; display: none;">
    Unlock QuickFix or Pro to view them all and reduce your Sus Score and reset the free scans
  </p>

  <!-- Hover instruction -->
  <p id="freeTriggerChipsHint" style="font-size: 12px; color: #9ca3af; margin: 0 0 12px 0; text-align: center; font-style: italic; opacity: 0.7;">Hover over each trigger word for to see why it might get flagged</p>
  
  <!-- TRIGGER CHIPS (red pill-shaped buttons with lock icons) -->
  <div id="freeTriggerChips" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px;">
    <!-- JavaScript populates this -->
  </div>
</div>
```

## 3. HTML Structure - CTA Under Text

**Location: Lines 5884-5892**

```html
<!-- CTA UNDER-TEXT (Clean/No Sus only) -->
<div id="cleanNoSusCtaUndertext" style="margin: 16px 0 12px 0; text-align: center; line-height: 1.6; display: none;">
  <div style="font-size: 20px; margin-bottom: 8px; font-weight: bold;">⚠️ FYI, Bestie</div>
  <p style="font-size: 20px; color: #6b7280; margin: 0 0 8px 0; line-height: 1.6; font-weight: 500;">
    AI detectors are unpredictable — essays flagged 0% today can trigger tomorrow.
  </p>
  <p style="font-size: 20px; color: #6b7280; margin: 0; line-height: 1.6; font-weight: 500;">
    Better safe than sus.
  </p>
</div>
```

## 4. HTML Structure - Can't Decide Message

**Location: Lines 5894-5897**

```html
<!-- Can't Decide Message -->
<p id="cantDecideMessage" style="text-align: center; color: #1f2937; font-size: 16px; margin: 20px 0 24px 0; line-height: 1.6; font-weight: 600; display: block !important; visibility: visible !important; opacity: 1 !important; background: #fef3c7; padding: 12px 20px; border-radius: 8px; border: 1px solid #fbbf24;">
  Can't decide? Scroll down to see what you actually get with each option 👇
</p>
```

## 5. HTML Structure - Lockbox (QuickFix CTA)

**Location: Lines 5900-5923**

```html
<!-- LOCKBOX CARD - Dynamic colors based on score -->
<div id="freeUnlockOverlay" style="position: relative; margin-bottom: 20px; padding: 0; overflow: hidden; min-height: 450px; opacity: 1; visibility: visible;">
  
  <!-- BLURRED BACKGROUND - User's Essay Goes Here -->
  <div id="lockboxBlurredBackground" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; padding: 32px 24px; filter: blur(6px); opacity: 0.9; pointer-events: none;">
    <div style="font-size: 13px; line-height: 1.6; color: #6b7280; white-space: pre-wrap; word-wrap: break-word; max-height: 400px; overflow: hidden;">
      [Essay preview will appear here]
    </div>
</div>
  
  <!-- OVERLAY CONTENT (Lock icon, text, button) -->
  <div style="position: relative !important; z-index: 9999 !important; padding: 32px 24px !important; text-align: center !important; border: 2px dashed #dc2626 !important; border-radius: 8px !important; background: white !important; box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; opacity: 1 !important; visibility: visible !important; margin: 0 !important;">
    <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
    <h3 id="lockboxHeading" style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.3;">Need a Quick Last Minute Fix?</h3>
    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; color: #374151;">Did you know your 100% human-written essay can sound AI to detectors and still get flagged? Yup, that's wild AF! For $1.99, QuickFix shows you what Turnitin will flag and how to fix it. Don't turn it in yet. Fix it first.</p>
    <p id="quickfixPreCheckBox" style="font-size: 18px; font-weight: 600; margin: 0 auto 16px auto; color: #1f2937; border: 2px dashed #ff6b00 !important; padding: 12px 16px; border-radius: 6px; display: block; width: fit-content; text-align: center; box-sizing: border-box;">Don't Risk It. QuickFix It.</p>
    <div style="margin-top: 16px; margin-bottom: 16px; padding-bottom: 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
      <div style="font-size: 16px; display: flex; align-items: center; gap: 4px;"><span>✅</span><span>Zero commitment</span></div>
      <div style="font-size: 16px; display: flex; align-items: center; gap: 4px;"><span>✅</span><span>Zero panic</span></div>
      <div style="font-size: 16px; display: flex; align-items: center; gap: 4px;"><span>✅</span><span>Zero F's given</span></div>
    </div>
    <button onclick="handleQuickFixClick()" style="background: #ff6b00; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-bottom: 12px;"><span>⚡</span><span>Unlock QuickFix -$1.99</span></button>
    <p style="font-size: 13px; margin: 0; color: #6b7280;">Only $1.99 for peace of mind 🤝</p>
  </div>
</div>
```

## 6. HTML Structure - Pro Upsell Section

**Location: Lines 5928-5938**

```html
<!-- ===== UPSELL SECTION ===== -->
<div id="freeUpsellSection" class="card" style="display: none; padding: 20px; background: #0099DD; color: white; text-align: center; margin-bottom: 20px;">
  <h3 id="freeUpsellHeading" style="color: #fff; font-weight: 800; font-size: 22px; margin: 0 0 12px 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
    <span id="freeUpsellHeadingText">🚀 Go Pro and chill...</span>
  </h3>
  <p id="freeUpsellText" style="color: #fff; font-size: 13px; margin: 0 0 12px 0; line-height: 1.5;">
    500 monthly scans • Catch ALL triggers before your prof does • 5,000 character limit
  </p>
  <button onclick="handleProUpgrade()" style="background: white; color: #00a8e8; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; width: 100%;">
    → Get Pro - $9.99/mo
  </button>
</div>
```

## 7. HTML Structure - Footer Buttons

**Location: Lines 5941-5948**

```html
<!-- ===== FOOTER BUTTONS ===== -->
<div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
  <button id="scanAnotherEssayBtn" onclick="scanNewText()" style="padding: 12px 20px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; background: white; border: 2px solid #e5e7eb; color: #374151; flex: 1; min-width: 140px;">
    📝 Scan Another Essay
  </button>
  <button onclick="minimizeResults()" style="padding: 12px 20px; font-size: 13px; font-weight: 600; border-radius: 8px; cursor: pointer; background: white; border: 2px solid #e5e7eb; color: #374151; flex: 1; min-width: 140px;">
    🏠 Back To Main Dashboard
  </button>
</div>
```

## 8. JavaScript Logic - Clean No Sus Handling

**Location: Lines 21154-21687 (within `showFreeUserResult()` function)**

The key JavaScript logic that handles Clean No Sus (score < 30) includes:

1. **Hiding the bottom box (`youreGoodCard`)** - Line 21156
2. **Updating trigger heading to show "0 Shown 0 Detected"** - Lines 21370-21389
3. **Hiding trigger chips hint** - Lines 21391-21396
4. **Hiding warning message box** - Lines 21398-21403
5. **Hiding trigger chips** - Lines 21405-21410
6. **Hiding lockbox overlay** - Lines 21425-21430
7. **Showing CTA under-text** - Lines 21432-21437
8. **Populating essay preview** - Lines 21499-21662

Key code snippet:
```javascript
if (score < 30) {
  // For Free Clean No Sus, hide the bottom box (youreGoodCard) - we use freeCleanNoSusEssayContainer instead
  if (youreGoodCard) youreGoodCard.style.display = 'none';
  cardToShow = 'youreGood';
  
  // ... Clean No Sus specific logic ...
  
  // Update trigger heading to show 0/0
  const headingText = document.getElementById('freeTriggerHeadingText');
  if (headingText) {
    headingText.textContent = '';
    headingText.style.fontSize = '22px';
    headingText.appendChild(document.createTextNode('⚡ AI Trigger Words/Phrases: '));
    const span1 = document.createElement('span');
    span1.style.color = '#2ecc71'; // Green for clean
    span1.style.fontWeight = '800';
    span1.textContent = '0';
    headingText.appendChild(span1);
    headingText.appendChild(document.createTextNode(' Shown '));
    const span2 = document.createElement('span');
    span2.style.color = '#2ecc71';
    span2.style.fontWeight = '800';
    span2.textContent = '0';
    headingText.appendChild(span2);
    headingText.appendChild(document.createTextNode(' Detected'));
  }
  
  // Hide hover hint
  const triggerChipsHint = document.getElementById('freeTriggerChipsHint');
  if (triggerChipsHint) {
    triggerChipsHint.style.display = 'none';
  }
  
  // Populate essay preview
  const freeCleanNoSusEssayContainer = document.getElementById('freeCleanNoSusEssayContainer');
  const freeCleanNoSusEssayContent = document.getElementById('freeCleanNoSusEssayContent');
  
  if (freeCleanNoSusEssayContainer) {
    freeCleanNoSusEssayContainer.style.setProperty('display', 'block', 'important');
    // ... show container ...
  }
  
  if (freeCleanNoSusEssayContainer && freeCleanNoSusEssayContent) {
    // Populate essay content
    freeCleanNoSusEssayContent.innerHTML = `<div style="font-weight: 700; color: #374151; margin-bottom: 12px; text-transform: uppercase; font-size: 14px; text-align: center;">YOUR ESSAY PREVIEW:</div><p style="white-space: pre-wrap; word-wrap: break-word; margin: 0; padding: 0;">${escapedPreview}</p>`;
    
    // Show copy button
    const freeCleanNoSusCopyTextCTA = document.getElementById('freeCleanNoSusCopyTextCTA');
    if (freeCleanNoSusCopyTextCTA) {
      freeCleanNoSusCopyTextCTA.style.setProperty('display', 'block', 'important');
    }
  }
}
```

## 9. CSS Styling

**Location: Lines 1178-1182**

```css
/* Clean No Sus page (score < 30) gets extra padding below heading */
#youreGoodCard[style*="display: block"] ~ * #freeTriggerHeading,
body:has(#youreGoodCard[style*="display: block"]) #freeTriggerHeading {
  margin-bottom: 6px !important;
}
```

## Notes:

- The `youreGoodCard` is hidden for Free Clean No Sus (line 21156)
- The `freeCleanNoSusEssayContainer` is shown instead (line 21506)
- The trigger heading is updated to show "0 Shown 0 Detected" (lines 21370-21389)
- The Pro CTA (`freeUpsellSection`) uses `background: #0099DD` (line 5928)
- The lockbox overlay is hidden for Clean No Sus (line 21428)
