// modules/autoLearning/autoLearningManager.js
const WebScraper = require('./webScraper');
const PDFParser = require('./pdfParser');
const WordParser = require('./wordParser');
const ContentProcessor = require('./contentProcessor');
const KnowledgeExtractor = require('./knowledgeExtractor');
const MemoryManager = require('../memory/memoryManager');
const logger = require('../logger');

class AutoLearningManager {
  constructor() {
    this.webScraper = new WebScraper();
    this.pdfParser = new PDFParser();
    this.wordParser = new WordParser();
    this.contentProcessor = new ContentProcessor();
    this.knowledgeExtractor = new KnowledgeExtractor();
    this.memoryManager = new MemoryManager();
    this.isProcessing = false;
  }

  // 🌐 WEB SİTESİNDEN ÖĞRENME
  async learnFromWebsite(url, message = null) {
    if (this.isProcessing) {
      await this.sendProgress(message, '⏳ Zaten bir işlem devam ediyor...');
      return;
    }

    try {
      this.isProcessing = true;
      
      if (message) await this.sendProgress(message, `🌐 Web sitesi taranıyor: ${url}`);
      
      // 1. Web sitesinden içerik çek
      const webContent = await this.webScraper.scrapeWebsite(url);
      
      if (message) await this.sendProgress(message, `✅ İçerik çekildi: ${webContent.title}`);
      
      // 2. İçeriği temizle ve işle
      const processedContent = await this.contentProcessor.processContent(webContent.content, 'web');
      
      if (message) await this.sendProgress(message, `🧹 İçerik işleniyor: ${processedContent.sentences.length} cümle`);
      
      // 3. Bilgileri çıkar
      const knowledge = await this.knowledgeExtractor.extractKnowledge(processedContent);
      
      if (message) await this.sendProgress(message, `🔍 Bilgiler çıkarılıyor: ${knowledge.qaPairs.length} soru-cevap`);
      
      // 4. Belleğe kaydet
      const savedCount = await this.saveToMemory(knowledge);
      
      if (message) {
        await this.sendProgress(message, 
          `🎉 Öğrenme tamamlandı!\n\n` +
          `• Kaynak: ${webContent.title}\n` +
          `• Kaydedilen bilgiler: ${savedCount}\n` +
          `• Soru-Cevap: ${knowledge.qaPairs.length}\n` +
          `• Anahtar bilgiler: ${knowledge.keyFacts.length}`
        );
      }
      
      logger.info(`Web öğrenme tamamlandı: ${url} - ${savedCount} bilgi kaydedildi`);
      return { success: true, savedCount, knowledge };
      
    } catch (error) {
      const errorMsg = `❌ Web öğrenme hatası: ${error.message}`;
      logger.error(errorMsg);
      if (message) await this.sendProgress(message, errorMsg);
      return { success: false, error: error.message };
    } finally {
      this.isProcessing = false;
    }
  }

  // 📄 PDF'DEN ÖĞRENME
  async learnFromPDF(buffer, filename, message = null) {
    try {
      if (message) await this.sendProgress(message, `📄 PDF işleniyor: ${filename}`);
      
      // 1. PDF'den içerik çek
      const pdfContent = await this.pdfParser.parsePDF(buffer);
      
      if (message) await this.sendProgress(message, `✅ PDF okundu: ${pdfContent.pageCount} sayfa`);
      
      // 2. İçeriği işle
      const processedContent = await this.contentProcessor.processContent(pdfContent.content, 'pdf');
      
      // 3. Bilgileri çıkar
      const knowledge = await this.knowledgeExtractor.extractKnowledge(processedContent);
      
      // 4. Belleğe kaydet
      const savedCount = await this.saveToMemory(knowledge);
      
      if (message) {
        await this.sendProgress(message,
          `🎉 PDF öğrenme tamamlandı!\n\n` +
          `• Dosya: ${filename}\n` +
          `• Sayfa: ${pdfContent.pageCount}\n` +
          `• Kaydedilen: ${savedCount} bilgi`
        );
      }
      
      return { success: true, savedCount, knowledge };
      
    } catch (error) {
      const errorMsg = `❌ PDF öğrenme hatası: ${error.message}`;
      logger.error(errorMsg);
      if (message) await this.sendProgress(message, errorMsg);
      return { success: false, error: error.message };
    }
  }

  // 📝 WORD DOSYASINDAN ÖĞRENME
  async learnFromWord(buffer, filename, message = null) {
    try {
      if (message) await this.sendProgress(message, `📝 Word dosyası işleniyor: ${filename}`);
      
      // 1. Word'den içerik çek
      const wordContent = await this.wordParser.parseWordDocument(buffer);
      
      // 2. İçeriği işle
      const processedContent = await this.contentProcessor.processContent(wordContent.content, 'word');
      
      // 3. Bilgileri çıkar
      const knowledge = await this.knowledgeExtractor.extractKnowledge(processedContent);
      
      // 4. Belleğe kaydet
      const savedCount = await this.saveToMemory(knowledge);
      
      if (message) {
        await this.sendProgress(message,
          `🎉 Word öğrenme tamamlandı!\n\n` +
          `• Dosya: ${filename}\n` +
          `• Kaydedilen: ${savedCount} bilgi`
        );
      }
      
      return { success: true, savedCount, knowledge };
      
    } catch (error) {
      const errorMsg = `❌ Word öğrenme hatası: ${error.message}`;
      logger.error(errorMsg);
      if (message) await this.sendProgress(message, errorMsg);
      return { success: false, error: error.message };
    }
  }

  // 💾 BELLEĞE KAYDETME
  async saveToMemory(knowledge) {
    let savedCount = 0;
    
    // Soru-cevap çiftlerini kaydet
    for (const qa of knowledge.qaPairs) {
      try {
        await this.memoryManager.addKnowledge(qa.question, qa.answer);
        savedCount++;
      } catch (error) {
        logger.warn(`Soru-cevap kaydedilemedi: ${qa.question} - ${error.message}`);
      }
    }
    
    // Anahtar bilgileri kaydet
    for (const fact of knowledge.keyFacts) {
      try {
        // Anahtar bilgileri soru formatına dönüştür
        const question = this.generateQuestionFromFact(fact.key);
        await this.memoryManager.addKnowledge(question, fact.value);
        savedCount++;
      } catch (error) {
        logger.warn(`Anahtar bilgi kaydedilemedi: ${fact.key} - ${error.message}`);
      }
    }
    
    return savedCount;
  }

  // ❓ ANAHTAR BİLGİDEN SORU ÜRETME
  generateQuestionFromFact(fact) {
    const questionPatterns = [
      `{fact} nedir?`,
      `{fact} ne demek?`,
      `{fact} hakkında bilgi verir misiniz?`,
      `{fact} nasıl çalışır?`,
      `{fact} süreci nasıl işler?`
    ];
    
    const randomPattern = questionPatterns[Math.floor(Math.random() * questionPatterns.length)];
    return randomPattern.replace('{fact}', fact);
  }

  // 📊 İLERLEME MESAJI GÖNDERME
  async sendProgress(message, text) {
    try {
      await message.reply(text);
    } catch (error) {
      logger.error(`İlerleme mesajı gönderilemedi: ${error.message}`);
    }
  }

  // 📈 DURUM RAPORU
  async getLearningStatus() {
    const allKnowledge = this.memoryManager.listKnowledge();
    
    return {
      totalKnowledge: allKnowledge.length,
      isProcessing: this.isProcessing,
      lastOperations: this.getLastOperations(),
      memoryUsage: process.memoryUsage()
    };
  }

  getLastOperations() {
    // Son öğrenme operasyonlarını takip et
    return [];
  }
}

module.exports = AutoLearningManager;
