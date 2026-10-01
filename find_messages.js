const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\juan\\.gemini\\antigravity-ide\\brain\\40ce7e25-337d-4744-a945-32de8e1287ce\\.system_generated\\logs\\transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.source === 'USER_EXPLICIT' && parsed.type === 'USER_INPUT') {
        if (parsed.content.toLowerCase().includes("secciones") || 
            parsed.content.toLowerCase().includes("9") ||
            parsed.content.toLowerCase().includes("10")) {
          console.log("-----------------------------------------");
          console.log(parsed.content.substring(0, 500) + "...");
        }
      }
    } catch(e) {}
  }
}

processLineByLine();
