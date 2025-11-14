// modules/autoLearning/pdfParser.js
const pdf = require('pdf-parse');

async function parsePDF(buffer) {
  try {
    const data = await pdf(buffer);
    return {
      content: data.text.split('\n').filter(line => line.trim().length > 10),
      pageCount: data.numpages,
      source: 'pdf_document'
    };
  } catch (error) {
    throw new Error(`PDF işlenemedi: ${error.message}`);
  }
}
