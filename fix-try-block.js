import fs from 'fs';

const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

// Try block starts at line 16243 (index 16242)
// Catch block is at line 18191 (index 18190)
const tryStart = 16242;
const catchLine = 18190;

console.log(`Fixing indentation from line ${tryStart + 1} to ${catchLine + 1}`);

// Track brace depth to understand structure
let braceDepth = 0;
let inTryBlock = false;

const fixedLines = lines.map((line, index) => {
  // Mark when we enter the try block
  if (index === tryStart) {
    inTryBlock = true;
    braceDepth = 1; // We're inside the try block
    return line;
  }
  
  // Mark when we reach the catch
  if (index === catchLine) {
    inTryBlock = false;
    return line;
  }
  
  // Only process lines inside the try block
  if (index <= tryStart || index >= catchLine) {
    return line;
  }
  
  const trimmed = line.trim();
  if (trimmed === '') {
    return line;
  }
  
  // Count braces to track depth
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  braceDepth += openBraces - closeBraces;
  
  // Get current indentation
  const currentSpaces = line.length - line.trimStart().length;
  
  // If line has less than 4 spaces of indentation and it's not a closing brace at function level,
  // it needs to be indented to be inside the try block
  // Base indentation for try block content should be 4 spaces (2 for function, 2 for try)
  if (currentSpaces < 4 && !(trimmed.startsWith('}') && currentSpaces === 2)) {
    // Add 2 spaces to bring it inside the try block
    return '  ' + line;
  }
  
  return line;
});

fs.writeFileSync('public/index.html', fixedLines.join('\n'), 'utf8');
console.log('✅ Fixed indentation');












