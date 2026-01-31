import fs from 'fs';

const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

// Find the showFreeUserResult function
let inFunction = false;
let functionStart = -1;
let functionEnd = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('function showFreeUserResult()')) {
    inFunction = true;
    functionStart = i;
    braceCount = 0;
  }
  
  if (inFunction) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceCount += openBraces - closeBraces;
    
    // Check if we've closed the function
    if (braceCount === 0 && i > functionStart && line.trim().startsWith('}')) {
      functionEnd = i;
      break;
    }
  }
}

if (functionStart === -1) {
  console.log('Could not find showFreeUserResult function');
  process.exit(1);
}

console.log(`Function starts at line ${functionStart + 1}`);
if (functionEnd !== -1) {
  console.log(`Function ends at line ${functionEnd + 1}`);
  console.log(`Function length: ${functionEnd - functionStart + 1} lines`);
} else {
  console.log('⚠️ Function not properly closed!');
  console.log(`Current brace count: ${braceCount}`);
}

// Check try-catch structure
let inTry = false;
let tryStart = -1;
let catchLine = -1;

for (let i = functionStart; i < (functionEnd !== -1 ? functionEnd : lines.length); i++) {
  const line = lines[i];
  
  if (line.includes('  try {') && !line.includes('catch')) {
    inTry = true;
    tryStart = i;
  }
  
  if (inTry && line.includes('  } catch (error) {')) {
    catchLine = i;
    break;
  }
}

if (tryStart !== -1 && catchLine !== -1) {
  console.log(`\nTry block starts at line ${tryStart + 1}`);
  console.log(`Catch block at line ${catchLine + 1}`);
  console.log(`Try block length: ${catchLine - tryStart + 1} lines`);
  
  // Check brace balance in try block
  let tryBraceCount = 0;
  for (let i = tryStart; i <= catchLine; i++) {
    const line = lines[i];
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    tryBraceCount += openBraces - closeBraces;
  }
  console.log(`Brace balance in try block: ${tryBraceCount}`);
  
  if (tryBraceCount !== 0) {
    console.log('⚠️ Try block has unbalanced braces!');
  }
} else {
  console.log('\n⚠️ Could not find try-catch structure');
  if (tryStart !== -1) {
    console.log(`Found try at line ${tryStart + 1} but no matching catch`);
  }
}












