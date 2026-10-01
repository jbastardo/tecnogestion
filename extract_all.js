const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\juan\\.gemini\\antigravity-ide\\brain\\40ce7e25-337d-4744-a945-32de8e1287ce\\.system_generated\\logs\\transcript_full.jsonl');
  const writeStream = fs.createWriteStream('C:\\Antigravity\\TecnoGestion\\all_user_messages.txt');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.source === 'USER_EXPLICIT' && parsed.type === 'USER_INPUT') {
        writeStream.write("-----------------------------------------\n");
        writeStream.write(parsed.content + "\n");
      }
    } catch(e) {}
  }
  writeStream.end();
}

processLineByLine();
