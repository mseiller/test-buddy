// Script to replace console statements with safeConsole in production files
const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '..', 'src', 'services');

function replaceConsoleInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has safeConsole import
    if (content.includes('safeConsole')) {
      console.log(`Skipping ${filePath} - already has safeConsole`);
      return;
    }
    
    // Add safeConsole import
    if (content.includes("import { logger } from './logger';")) {
      content = content.replace(
        "import { logger } from './logger';",
        "import { logger } from './logger';\nimport { safeConsole } from '@/utils/console';"
      );
    } else if (content.includes("import { logger } from './logger';")) {
      content = content.replace(
        "import { logger } from './logger';",
        "import { logger } from './logger';\nimport { safeConsole } from '@/utils/console';"
      );
    } else {
      // Add import at the top
      const lines = content.split('\n');
      const lastImportIndex = lines.findLastIndex(line => line.startsWith('import '));
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "import { safeConsole } from '@/utils/console';");
        content = lines.join('\n');
      }
    }
    
    // Replace console statements
    content = content.replace(/console\.log\(/g, 'safeConsole.log(');
    content = content.replace(/console\.warn\(/g, 'safeConsole.warn(');
    content = content.replace(/console\.error\(/g, 'safeConsole.error(');
    content = content.replace(/console\.info\(/g, 'safeConsole.info(');
    content = content.replace(/console\.debug\(/g, 'safeConsole.debug(');
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Process all service files
const files = fs.readdirSync(servicesDir);
files.forEach(file => {
  if (file.endsWith('.ts') && file !== 'logger.ts') {
    replaceConsoleInFile(path.join(servicesDir, file));
  }
});

console.log('Console silencing complete!');
