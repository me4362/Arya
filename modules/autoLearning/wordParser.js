// modules/autoLearning/wordParser.js
const mammoth = require('mammoth');

async function parseWordDocument(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      content: result.value.split('\n').filter(line => line.trim().length > 10),
      source: 'word_document'
    };
  } catch (error) {
    throw new Error(`Word dosyası işlenemedi: ${error.message}`);
  }
}
