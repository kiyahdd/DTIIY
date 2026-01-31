import fs from 'fs';

const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

// Find the main try block at line 16243 (index 16242)
const tryLine = 16242;
const catchLine = 18190; // Line 18191 is index 18190

console.log(`Checking try block from line ${tryLine + 1} to ${catchLine + 1}`);

// Count braces in the try block
let braceCount = 0;
let issues = [];

for (let i = tryLine; i <= catchLine; i++) {
  const line = lines[i];
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  const netBraces = openBraces - closeBraces;
  braceCount += netBraces;
  
  // Track when brace count goes negative (too many closes)
  if (braceCount < 0) {
    issues.push(`Line ${i + 1}: Too many closing braces (count: ${braceCount})`);
  }
  
  // Track when brace count is high (might indicate unclosed blocks)
  if (braceCount > 10 && i % 100 === 0) {
    console.log(`Line ${i + 1}: Brace count is ${braceCount}`);
  }
}

console.log(`\nFinal brace count in try block: ${braceCount}`);
if (braceCount !== 0) {
  console.log('⚠️ Try block has unbalanced braces!');
  console.log(`Need ${Math.abs(braceCount)} more ${braceCount > 0 ? 'closing' : 'opening'} brace(s)`);
}

if (issues.length > 0) {
  console.log('\nIssues found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
}

// Check the catch line
console.log(`\nCatch line (${catchLine + 1}): "${lines[catchLine].trim()}"`);
console.log(`Line after catch (${catchLine + 2}): "${lines[catchLine + 1].trim()}"`);












