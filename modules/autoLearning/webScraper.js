// modules/autoLearning/webScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // İçeriği temizle ve çıkar
    const title = $('title').text();
    const paragraphs = $('p').map((i, el) => $(el).text()).get();
    const headings = $('h1, h2, h3').map((i, el) => $(el).text()).get();
    
    return {
      title,
      content: [...headings, ...paragraphs].filter(text => text.length > 20),
      source: url
    };
  } catch (error) {
    throw new Error(`Web sitesi çekilemedi: ${error.message}`);
  }
}
