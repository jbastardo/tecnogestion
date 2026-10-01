const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\juan\\.gemini\\antigravity-ide\\brain\\40ce7e25-337d-4744-a945-32de8e1287ce\\.system_generated\\logs\\transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let i = 0;
  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.source === 'USER_EXPLICIT' && parsed.type === 'USER_INPUT') {
        if (i < 3 || parsed.content.includes("secciones")) {
          console.log("-----------------------------------------");
          console.log(parsed.content);
        }
        i++;
      }
    } catch(e) {}
  }
}

processLineByLine();
