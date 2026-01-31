import fs from 'fs';

const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

// Find script sections
let inScript = false;
let scriptStart = -1;
let scriptEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<script>') && !lines[i].includes('</script>')) {
    inScript = true;
    scriptStart = i;
  }
  if (lines[i].includes('</script>') && inScript) {
    scriptEnd = i;
    break;
  }
}

if (scriptStart === -1 || scriptEnd === -1) {
  console.log('Could not find script tags');
  process.exit(1);
}

console.log(`Found script from line ${scriptStart + 1} to ${scriptEnd + 1}`);

// Extract JavaScript code
const jsLines = lines.slice(scriptStart + 1, scriptEnd);
const jsCode = jsLines.join('\n');

// Try to find syntax errors by checking brace balance
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < jsCode.length; i++) {
  const char = jsCode[i];
  if (char === '{') braceCount++;
  if (char === '}') braceCount--;
  if (char === '(') parenCount++;
  if (char === ')') parenCount--;
  if (char === '[') bracketCount++;
  if (char === ']') bracketCount--;
}

console.log(`Brace balance: ${braceCount}`);
console.log(`Paren balance: ${parenCount}`);
console.log(`Bracket balance: ${bracketCount}`);

if (braceCount !== 0 || parenCount !== 0 || bracketCount !== 0) {
  console.log('⚠️ Unbalanced braces/parens/brackets detected!');
}

// The main issue is likely in the showFreeUserResult function
// Let's check if we can find it and verify its structure
const showFreeUserResultMatch = jsCode.match(/function showFreeUserResult\(\)\s*\{[\s\S]*?\n\}/);
if (showFreeUserResultMatch) {
  console.log('✅ Found showFreeUserResult function');
} else {
  console.log('⚠️ Could not find showFreeUserResult function');
}












