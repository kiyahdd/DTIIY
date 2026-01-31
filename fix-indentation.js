import fs from 'fs';

// Read the file
const content = fs.readFileSync('public/index.html', 'utf8');
const lines = content.split('\n');

// Find the try block start (line 16243)
const tryStartLine = 16242; // 0-indexed (line 16243 is index 16242)
const catchLine = 18192; // 0-indexed (line 18193 is index 18192)

// Indent all lines between tryStartLine and catchLine by 2 spaces
// But only if they're not already indented enough
const fixedLines = lines.map((line, index) => {
  if (index > tryStartLine && index < catchLine) {
    // Skip lines that are already properly indented (start with 4+ spaces)
    // or are closing braces that should be at try block level
    if (line.trim() === '' || line.startsWith('    ')) {
      // Already indented or empty, check if it needs more
      if (line.trim() !== '' && !line.startsWith('      ')) {
        // Add 2 more spaces if it's not already at the right level
        // But be careful - some lines might be at the right level already
        if (line.match(/^\s{2,3}[^ ]/)) {
          // Line starts with 2-3 spaces, add 2 more
          return '  ' + line;
        }
      }
      return line;
    } else if (line.startsWith('  ')) {
      // Line starts with 2 spaces, add 2 more
      return '  ' + line;
    } else if (!line.startsWith(' ')) {
      // Line has no leading spaces, add 4 spaces (2 for try block, 2 for function)
      return '    ' + line;
    }
  }
  return line;
});

// Write the fixed content
fs.writeFileSync('public/index.html', fixedLines.join('\n'), 'utf8');
console.log('Fixed indentation for lines', tryStartLine + 1, 'to', catchLine + 1);

