import fs from 'fs';

// Read the file
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

// Find the try block start (line 16243, index 16242)
const tryStartIndex = 16242;
const catchIndex = 18192; // Line 18193 is index 18192

// Track indentation level
let indentLevel = 0;
const INDENT_SIZE = 2;

const fixedLines = lines.map((line, index) => {
  // Only process lines between try start and catch
  if (index <= tryStartIndex || index >= catchIndex) {
    return line;
  }
  
  const trimmed = line.trim();
  if (trimmed === '') {
    return line;
  }
  
  // Count current leading spaces
  const currentSpaces = line.length - line.trimStart().length;
  
  // Check if line starts a block (if, for, while, try, function, etc.)
  const startsBlock = /^\s*(if|for|while|try|catch|function|else|switch)\s*\(/.test(line) || 
                      /^\s*else\s*\{/.test(line) ||
                      /^\s*\{/.test(line);
  
  // Check if line closes a block
  const closesBlock = /^\s*\}/.test(line);
  
  // Calculate expected indentation
  // Base: 2 spaces for function, 2 more for try block = 4 spaces minimum
  let expectedSpaces = 4;
  
  // If current line has less than 4 spaces and it's not a closing brace at function level, add 2
  if (currentSpaces < 4 && !(closesBlock && currentSpaces === 2)) {
    // Add 2 spaces to bring it inside the try block
    return '  ' + line;
  }
  
  // If line already has 4+ spaces, it's probably correctly indented
  return line;
});

// Write the fixed content
fs.writeFileSync('public/index.html', fixedLines.join('\n'), 'utf8');
console.log('Fixed indentation for lines', tryStartIndex + 1, 'to', catchIndex + 1);












