# 🎯 CURSOR: FALSE FLAG FIXER STEP 3 — COMPLETE IMPLEMENTATION

**PURPOSE**: Replace entire Step 3 with new architecture: Two scores (Text Risk + False Flag Flow™), mission-driven messaging, user authorship preservation.

---

# 📋 ARCHITECTURE (What Cursor Needs to Build)

## Two Distinct Scores

| Score | Type | Range | Analyzed By | What We Do |
|-------|------|-------|-------------|-----------|
| **Text Risk** | Percentage | 0-100% | False Flag Fixer | FIX (user chooses) |
| **False Flag Flow™** | Level | Low/Med/High | False Flag Flow™ Methodology | PRESERVE (user's voice) |

---

# 🎨 STEP 3 PAGE STRUCTURE (In Order)

## SECTION 1: HEADER
```
Title: "The False Flag Flow™ Results — Your Essay, Verified 🛡️"
Subtitle: "Here's what our two-layer analysis found."
```

## SECTION 2: OVERALL SCORE (Use Your Existing Progress Bar)
- **Display**: Overall Risk Score (0-100%)
- **Status**: Clean / Low Risk / Medium Risk labels
- **Progress Bar**: REUSE your existing progress-bar component
  - Before score → After score animation
  - Color: Green for low, Amber for medium, Red for high
  - Labels: 0% (Clean) → 50% (Caution) → 100% (High)

## SECTION 3: TWO SCORE CARDS (Side-by-side)

### Card 1: Text Risk
```
Icon: ✍️
Title: Text Risk
Score: 25% (example)
Subtitle: "Based on wording only"
Description: "False Flag Fixer identified AI-flagged vocabulary, 
phrases, and sentence patterns. We've replaced these with your 
chosen alternatives."
Color: Green (fixed, actionable)
```

### Card 2: False Flag Flow™
```
Icon: 🌊
Title: False Flag Flow™
Score: Strong (or Low/Med/High)
Subtitle: "Your natural voice and rhythm"
Methodology Tooltip:
"False Flag Flow™ analyzes your sentence variety, paragraph pacing, 
voice consistency, and natural rhythm to measure how authentically 
human your writing is.

We don't modify this — because it can't be changed without erasing 
who you are as a writer. If your False Flag Flow™ is strong, 
detectors see a real human wrote this."
Color: Amber (advisory, not changed)
```

## SECTION 4: MISSION BANNER (Replace Disclaimer)
```html
Background: Green gradient (#10b981 → #059669)
Title: "Protected from False Flags 🛡️"
Body Text:
"AI detection tools aren't perfect. They flag authentic student 
work every day — and innocent students have been expelled over it.

The False Flag Flow™ analyzes your essay in two layers: 
Text Risk (what you wrote) and False Flag Flow™ (how naturally 
you wrote it).

If both are strong, your essay is unmistakably yours. You can 
submit with confidence. If something's flagged, you know exactly 
what to address.

This is protection, not evasion. Transparency, not trickery."
```

## SECTION 5: EDITABLE TEXT BOX
```
Label: "✏️ Your Fixed Essay"
Hint: "All AI trigger words have been replaced. You can edit 
this text if you want, then copy and paste into your document. 
Small, natural changes (sentence rhythm, transitions, emphasis) 
can reduce pattern-based flags."
Box: contenteditable div, monospace font, 240px min-height
Below: Two buttons (Re-Scan + Copy)
```

## SECTION 6: GUIDANCE SECTION
```
Title: "🤔 If This Were My Essay, I'd Check:"
Intro: "These aren't things we'll fix for you. But if you're 
curious about patterns detectors flag, here are principles to consider:"

Bullet 1:
"Paragraph variety — Are all your paragraphs similar length? 
Detectors sometimes flag essays where every paragraph is 4 sentences 
long. Natural writing varies."

Bullet 2:
"Sentence starts — Do too many sentences start the same way? 
(The, This, Studies show) — mix it up naturally."

Bullet 3:
"Tone consistency — Does your voice stay too consistent? Real writing 
has rhythms, energy shifts, moments of emphasis."

Bullet 4:
"Writing pace — Would you naturally write this in one sitting? Real 
essays have moments where you slow down, speed up, circle back."
```

## SECTION 7: RESCAN BUTTON
```
Button: "🔄 Re-Scan After My Edits"
Subtext: "Pro: 500 rescans/month. Free: Limited rescans. See how 
small changes affect detection risk."
```

## SECTION 8: FINAL CTA
```
Background: Green gradient
Title: "Your False Flag Flow™ is Strong 🛡️"
Body: "False Flag Fixer has verified your essay. Your text is clean. 
Your flow is natural.

You're protected from false flags. Turn this in with confidence."
Button: "📋 Copy & Submit"
```

## SECTION 9: ACTION BUTTONS
```
Button 1: "← Back to Dashboard"
Button 2: "➕ Scan Another Essay"
(Optional Pro) Button 3: "💎 Upgrade to Pro"
```

---

# 💾 BACKEND DATA STRUCTURE

## What `/analyze` Endpoint Must Return (For Step 3)

```json
{
  "textRisk": 25,
  "textRiskLabel": "Low",
  "falseFlowLevel": "Strong",
  "falseFlowRisk": "Low",
  "beforeScore": 72,
  "afterScore": 25,
  "overallStatus": "Clean — Ready to Turn In",
  "statusEmoji": "✅",
  "fixedEssay": "Full text with all replacements applied...",
  "flags": [
    {
      "original": "Artificial intelligence is revolutionizing",
      "replacement": "AI is changing",
      "severity": "high",
      "category": "AI Trigger Word"
    }
  ],
  "message": "Your essay has been cleaned and verified.",
  "mode": "pro" or "free"
}
```

---

# 🎨 CSS/STYLING REQUIREMENTS

## Progress Bar (REUSE YOUR EXISTING)
```
Container: #e5e7eb background, 12px height, 6px border-radius
Fill: linear-gradient(90deg, #10b981 → #059669)
Animation: width transition 0.6s ease-out
Labels: "Before: 72%" | "After: 25%"
```

## Score Cards
```
Text Risk Card:
- Border-left: 4px solid #10b981 (green)
- Background: white
- Box-shadow: 0 2px 8px rgba(0,0,0,0.06)
- Score font: 36px, weight 800

False Flag Flow™ Card:
- Border-left: 4px solid #f59e0b (amber)
- Background: white
- Box-shadow: 0 2px 8px rgba(0,0,0,0.06)
- Tooltip: #f3f4f6 background, #f59e0b left border
```

## Colors (Consistent Across All)
```
Green (#10b981, #059669): Text Risk, Actions, Success
Amber (#f59e0b): False Flag Flow™, Advisory, Guidance
Gray (#6b7280): Secondary text
Dark (#1f2937): Primary text
```

## Typography
```
Headers: 700-800 weight, -0.5px letter-spacing
Body: 14-15px, #374151, 1.6 line-height
Monospace (editable text): 'Courier New', monospace
```

## Responsive
```
On mobile (<640px): Score cards stack to 1 column (not 2)
Buttons: Full width
Editable text: Min 240px height, max 400px with overflow-y
```

---

# ⚙️ JAVASCRIPT REQUIREMENTS

## Functions to Implement

### `displayStep3Results(data)`
```javascript
// Input: data object from /analyze endpoint
// Output: Populate all Step 3 sections with scores, text, etc.

Steps:
1. Update Text Risk score + card
2. Update False Flag Flow™ level + card
3. Update overall progress bar (animate from before → after)
4. Populate editable text area with fixedEssay
5. Update status emoji + label
6. Show/hide sections based on tier (free vs pro)
```

### `rescanEssay()`
```javascript
// When user clicks "Re-Scan After My Edits"

Steps:
1. Get text from contenteditable div
2. POST to /analyze endpoint with:
   - essay: (user's edited text)
   - tier: (user's current tier)
3. Call displayStep3Results(response)
4. Animate progress bar update
```

### `copyEssay()`
```javascript
// When user clicks "Copy & Submit" or "Copy Text"

Steps:
1. Get text from contenteditable div
2. navigator.clipboard.writeText(text)
3. Show confirmation: "✅ Copied to clipboard!"
```

### `goBack()`
```javascript
// Navigate to Step 1 or dashboard
```

### `startNewScan()`
```javascript
// Clear data, reset form, navigate to Step 1
```

---

# 🎯 KEY IMPLEMENTATION NOTES FOR CURSOR

## 1. REUSE PROGRESS BAR
Your existing progress bar component should be used as-is:
- Same styling
- Same animation
- Same labels (0%, 100%)
- Just update the percentage based on afterScore

## 2. TWO DISTINCT SCORES
**Don't combine them.** They measure different things:
- Text Risk = What False Flag Fixer found (% to fix)
- False Flag Flow™ = How your essay flows naturally (advisory, not fixable)

## 3. FALSE FLAG FLOW™ TERMINOLOGY
Use consistently:
- Card title: "False Flag Flow™"
- Level display: "Strong" or "Low" or "Medium"
- In copy: "Your False Flag Flow™ is strong"
- Never call it "Pattern Risk" or "Pattern Score"

## 4. METHODOLOGY TOOLTIP
The tooltip on False Flag Flow™ card is critical. It explains:
- What we measure (sentence variety, pacing, voice, rhythm)
- Why we don't change it (it's the user's authenticity)
- What it means (if strong, you're safe)

## 5. EDITABLE TEXT BOX
- Must be contenteditable (not textarea)
- Monospace font so it reads like code
- User can edit freely
- Changes persist when they rescan

## 6. MISSION BANNER
Replace the old "Important:" disclaimer completely. 
This new banner is the heart of Step 3 — it reframes the tool as protective, not evasive.

## 7. NO HIDDEN REWRITING
Everything the user will submit should be visible in the editable text box.
No "behind the scenes" processing.

---

# 📱 RESPONSIVE CHECKLIST

- [ ] Progress bar displays correctly on mobile
- [ ] Score cards stack to single column on <640px
- [ ] Editable text box is readable on small screens
- [ ] Buttons are full-width on mobile
- [ ] Font sizes scale appropriately
- [ ] Tooltip information is readable
- [ ] Mission banner text wraps properly
- [ ] Guidance bullets don't overflow

---

# 🔌 API INTEGRATION POINTS

## Endpoint: POST /analyze

**Input:**
```json
{
  "essay": "User's essay text (possibly edited)",
  "tier": "free" or "pro"
}
```

**Output (already defined above):**
```json
{
  "textRisk": 25,
  "falseFlowLevel": "Strong",
  "beforeScore": 72,
  "afterScore": 25,
  "fixedEssay": "...",
  "flags": [...],
  // ... (see Backend Data Structure section)
}
```

## When Called:
1. **After Step 2**: User applies fixes → POST /analyze → Show Step 3
2. **On Rescan**: User edits text in Step 3 → POST /analyze → Update all scores

---

# ✅ FINAL CHECKLIST FOR CURSOR

Before deploying Step 3:

- [ ] Progress bar reused from existing component
- [ ] Text Risk and False Flag Flow™ are visually distinct
- [ ] False Flag Flow™ tooltip explains methodology
- [ ] Mission banner replaces old disclaimer
- [ ] Editable text box is contenteditable
- [ ] Copy button uses navigator.clipboard
- [ ] Rescan button POSTs to /analyze with edited text
- [ ] Before/After scores display correctly
- [ ] Guidance section has NO code examples, NO AI tricks
- [ ] All text uses "False Flag Flow™" terminology (trademarked)
- [ ] Responsive on mobile (<640px)
- [ ] Color contrast meets WCAG AA
- [ ] Button hover states are clear
- [ ] Animations are smooth (not distracting)
- [ ] No console errors
- [ ] Data flows from backend correctly

---

# 🚀 DEPLOYMENT NOTES

1. **This replaces the entire Step 3 HTML**
   - Keep Step 1 and Step 2 as-is
   - Only Step 3 changes

2. **No backend changes required**
   - Your existing /analyze endpoint already returns what we need
   - Just make sure it includes the fields in "Backend Data Structure" above

3. **Testing**
   - Test with free tier (limited rescans)
   - Test with pro tier (500 rescans/month)
   - Test mobile responsiveness
   - Test copy button functionality
   - Test rescan flow (edit text → POST → update scores)

4. **Launch**
   - Deploy Step 3 separately if possible
   - Run A/B test if you want
   - Monitor for bugs on backend /analyze calls

---

# 📞 Questions for Cursor

When Cursor asks:
- "Should I use a modal or replace the whole page?" → **Replace the whole page**
- "Should False Flag Flow™ be editable?" → **No, it's advisory only**
- "How many guidance bullets?" → **Exactly 4 (variety, starts, tone, pace)**
- "Should there be a Pro upsell?" → **Optional, but justified by 500 rescans/month (no daily limit)**
- "Can students skip the editable text box?" → **No, they should review their essay**

---

**END OF CURSOR BRIEF**

This is everything Cursor needs to build Step 3. Send this file and you're done.






























