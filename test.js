const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  fs.writeFileSync('test_script.js', scriptMatch[1]);
  require('child_process').execSync('node -c test_script.js');
  console.log('Syntax check passed');
}
