import fs from 'fs';

const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

const tryStart = 16242; // Line 16243
const catchLine = 18190; // Line 18191

let braceDepth = 0;
const unclosedBlocks = [];

for (let i = tryStart; i <= catchLine; i++) {
  const line = lines[i];
  const openBraces = (line.match(/\{/g) || []).length;
  const closeBraces = (line.match(/\}/g) || []).length;
  const netBraces = openBraces - closeBraces;
  
  const beforeDepth = braceDepth;
  braceDepth += netBraces;
  
  // Track when we open a block
  if (openBraces > 0) {
    for (let j = 0; j < openBraces; j++) {
      unclosedBlocks.push({
        line: i + 1,
        depth: beforeDepth + j,
        content: line.trim().substring(0, 80)
      });
    }
  }
  
  // Track when we close a block
  if (closeBraces > 0) {
    for (let j = 0; j < closeBraces; j++) {
      if (unclosedBlocks.length > 0) {
        const closed = unclosedBlocks.pop();
        // Check if we're closing the right block
        if (closed.depth !== braceDepth - closeBraces + j) {
          console.log(`⚠️ Line ${i + 1}: Closing brace might not match opening brace`);
          console.log(`   Expected depth: ${closed.depth}, Actual: ${braceDepth - closeBraces + j}`);
        }
      }
    }
  }
  
  // Report high depth
  if (braceDepth > 8 && i % 200 === 0) {
    console.log(`Line ${i + 1}: Depth = ${braceDepth}, Unclosed blocks: ${unclosedBlocks.length}`);
  }
}

console.log(`\nFinal brace depth: ${braceDepth}`);
console.log(`Unclosed blocks: ${unclosedBlocks.length}`);

if (unclosedBlocks.length > 0) {
  console.log('\nUnclosed blocks (most recent first):');
  unclosedBlocks.slice(-10).reverse().forEach((block, idx) => {
    console.log(`  ${idx + 1}. Line ${block.line} (depth ${block.depth}): ${block.content}`);
  });
  
  console.log(`\n⚠️ Need to add ${unclosedBlocks.length} closing brace(s) before line ${catchLine + 1}`);
  console.log(`   Suggested location: After line ${catchLine} (before the catch block)`);
  console.log(`   Indentation: ${' '.repeat(4)} (4 spaces, inside try block)`);
}












