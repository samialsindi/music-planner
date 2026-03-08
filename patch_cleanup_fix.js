const fs = require('fs');
const file = 'src/app/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const firstIndex = code.indexOf('const handleCleanUp = async () => {');
const lastIndex = code.lastIndexOf('const handleCleanUp = async () => {');

if (firstIndex !== lastIndex) {
  console.log("Found duplicate!");
  // Find the 'return (' right before the last one, wait we want to remove the SECOND one.
  const beforeSecond = code.substring(0, lastIndex);
  const afterSecond = code.substring(code.indexOf('return (', lastIndex));
  code = beforeSecond + afterSecond;
  fs.writeFileSync(file, code);
}
