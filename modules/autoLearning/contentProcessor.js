// modules/autoLearning/contentProcessor.js
const natural = require('natural');
const logger = require('../logger');

class ContentProcessor {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stopwords = this.getTurkishStopwords();
  }

  // 🛑 TÜRKÇE STOPWORDS LİSTESİ
  getTurkishStopwords() {
    return new Set([
      'acaba', 'ama', 'aslında', 'az', 'bazı', 'belki', 'biri', 'birkaç', 'birşey', 'biz', 'bu',
      'çok', 'çünkü', 'da', 'daha', 'de', 'defa', 'diye', 'eğer', 'en', 'gibi', 'hem', 'hep',
      'her', 'hiç', 'için', 'ile', 'ise', 'kez', 'ki', 'kim', 'mı', 'mu', 'mü', 'nasıl', 'ne',
      'neden', 'nerede', 'neredeyse', 'niçin', 'niye', 'o', 'sanki', 'şey', 'siz', 'şu', 'tüm',
      've', 'veya', 'ya', 'yani', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz',
      'dokuz', 'on', 'var', 'yok', 'ise', 'mi', 'mı', 'mu', 'mü', 'de', 'da', 'te', 'ta',
      'ile', 'lar', 'ler', 'lik', 'lık', 'luk', 'lük', 'siz', 'sız', 'suz', 'süz', 'ci', 'cı',
      'cu', 'cü', 'çı', 'çi', 'çu', 'çü', 'lik', 'lık', 'luk', 'lük', 'ki', 'kü', 'ları', 'leri'
    ]);
  }

  // 🧹 İÇERİK İŞLEME ANA FONKSİYON
  async processContent(rawContent, sourceType = 'web') {
    try {
      console.log(`🧹 İçerik işleniyor: ${rawContent.length} karakter, Kaynak: ${sourceType}`);
      
      // 1. Temel temizleme
      const cleanedContent = this.cleanContent(rawContent);
      
      // 2. Cümlelere ayır
      const sentences = this.splitIntoSentences(cleanedContent);
      
      // 3. Cümleleri filtrele
      const filteredSentences = this.filterSentences(sentences);
      
      // 4. Tokenleştirme ve normalizasyon
      const processedSentences = filteredSentences.map(sentence => ({
        original: sentence,
        tokens: this.tokenizeAndNormalize(sentence),
        length: sentence.length,
        score: this.calculateSentenceScore(sentence)
      }));
      
      // 5. Skora göre sırala
      const sortedSentences = processedSentences
        .filter(sentence => sentence.score > 0.3) // Minimum skor filtresi
        .sort((a, b) => b.score - a.score)
        .slice(0, 100); // En fazla 100 cümle
      
      console.log(`✅ İşleme tamamlandı: ${sortedSentences.length} cümle`);
      
      return {
        originalLength: rawContent.length,
        processedLength: cleanedContent.length,
        sentences: sortedSentences,
        sourceType: sourceType,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`İçerik işleme hatası: ${error.message}`);
      throw error;
    }
  }

  // 🧽 TEMEL TEMİZLEME
  cleanContent(content) {
    if (Array.isArray(content)) {
      content = content.join('\n');
    }
    
    return content
      .replace(/[^\w\sğüşıöçĞÜŞİÖÇ.,!?;:()%$€@-]/g, ' ') // Özel karakterleri temizle
      .replace(/\s+/g, ' ') // Çoklu boşlukları tekilleştir
      .replace(/\n+/g, '\n') // Çoklu satır sonlarını temizle
      .trim();
  }

  // 📝 CÜMLELERE AYIRMA
  splitIntoSentences(text) {
    // Türkçe cümle sonu noktalama işaretleri
    const sentenceEnders = /[.!?]+/g;
    const sentences = text.split(sentenceEnders);
    
    return sentences
      .map(sentence => sentence.trim())
      .filter(sentence => 
        sentence.length > 10 && // Minimum uzunluk
        sentence.length < 500 && // Maksimum uzunluk
        !this.isNoise(sentence) // Gürültü filtresi
      );
  }

  // 🔇 GÜRÜLTÜ FİLTRESİ
  isNoise(sentence) {
    const noisePatterns = [
      /^[0-9\s]+$/, // Sadece sayılar
      /^[^\w\s]+$/, // Sadece özel karakterler
      /^(http|www)/, // URL'ler
      /^[A-Z\s]+$/, // Sadece büyük harfler
      /^(menu|menü|ana sayfa|homepage|copyright|telif)/i // Navigasyon metinleri
    ];
    
    return noisePatterns.some(pattern => pattern.test(sentence));
  }

  // 🎯 CÜMLE FİLTRELEME
  filterSentences(sentences) {
    return sentences.filter(sentence => {
      const wordCount = sentence.split(' ').length;
      const hasVerb = this.hasVerb(sentence);
      const isInformative = this.isInformative(sentence);
      
      return wordCount >= 3 && wordCount <= 25 && hasVerb && isInformative;
    });
  }

  // 🔤 TOKENLEŞTİRME VE NORMALİZASYON
  tokenizeAndNormalize(sentence) {
    const tokens = this.tokenizer.tokenize(sentence.toLowerCase());
    
    return tokens
      .filter(token => 
        token.length > 2 && // Kısa token'ları filtrele
        !this.stopwords.has(token) && // Stopwords'leri kaldır
        !/\d+/.test(token) // Sayıları kaldır
      )
      .map(token => natural.PorterStemmerTr.stem(token)); // Türkçe stemming
  }

  // ⚖️ CÜMLE SKORU HESAPLAMA
  calculateSentenceScore(sentence) {
    let score = 0;
    
    // Uzunluk skoru (10-30 kelime ideal)
    const wordCount = sentence.split(' ').length;
    if (wordCount >= 8 && wordCount <= 25) {
      score += 0.3;
    }
    
    // Soru cümlesi skoru
    if (this.isQuestion(sentence)) {
      score += 0.4;
    }
    
    // Bilgi yoğun kelimeler
    const infoWords = ['nedir', 'nasıl', 'neden', 'ne kadar', 'süre', 'fiyat', 'ücret', 'paket', 'hizmet'];
    if (infoWords.some(word => sentence.toLowerCase().includes(word))) {
      score += 0.3;
    }
    
    // Özel isim skoru (büyük harf ile başlayan kelimeler)
    const properNouns = sentence.split(' ').filter(word => 
      word.length > 2 && /^[A-ZĞÜŞİÖÇ]/.test(word)
    ).length;
    score += properNouns * 0.05;
    
    return Math.min(score, 1.0);
  }

  // ❓ SORU CÜMLESİ KONTROLÜ
  isQuestion(sentence) {
    const questionWords = ['mi', 'mı', 'mu', 'mü', 'mi?', 'mı?', 'mu?', 'mü?', 'nedir', 'nasıl', 'neden', 'ne kadar', 'kim', 'hangi'];
    const lowerSentence = sentence.toLowerCase();
    
    return questionWords.some(word => 
      lowerSentence.includes(word) ||
      lowerSentence.endsWith('?')
    );
  }

  // 📢 FİİL KONTROLÜ
  hasVerb(sentence) {
    const turkishVerbPatterns = [
      /(mek|mak)$/, // Mastar eki
      /(yor|di|miş|ecek|acak)$/, // Zaman ekleri
      /(malı|meli)$/ // Gereklilik kipi
    ];
    
    const words = sentence.toLowerCase().split(' ');
    return words.some(word => 
      turkishVerbPatterns.some(pattern => pattern.test(word))
    );
  }

  // 💡 BİLGİ İÇERİK KONTROLÜ
  isInformative(sentence) {
    const informativeIndicators = [
      'olarak', 'için', 'ile', 'kadar', 'gibi', 'göre', 'kontrol', 'sistem', 'hizmet',
      'paket', 'fiyat', 'ücret', 'süre', 'gün', 'ay', 'yıl', 'tl', 'dolar', 'euro'
    ];
    
    const lowerSentence = sentence.toLowerCase();
    return informativeIndicators.some(indicator => 
      lowerSentence.includes(indicator)
    );
  }

  // 🏷️ KATEGORİ TAHMİNİ
  predictCategory(sentence) {
    const categories = {
      sigorta: ['sigorta', 'teminat', 'poliçe', 'prim', 'hasar', 'kasko', 'sağlık sigortası'],
      yazılım: ['yazılım', 'kod', 'program', 'uygulama', 'web sitesi', 'mobil', 'api'],
      lojistik: ['kargo', 'nakliye', 'teslimat', 'lojistik', 'sevkiyat', 'depo'],
      genel: ['hizmet', 'müşteri', 'destek', 'iletişim', 'bilgi', 'soru']
    };
    
    const lowerSentence = sentence.toLowerCase();
    let bestCategory = 'genel';
    let maxScore = 0;
    
    for (const [category, keywords] of Object.entries(categories)) {
      const score = keywords.filter(keyword => 
        lowerSentence.includes(keyword)
      ).length;
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }
    
    return bestCategory;
  }
}

module.exports = ContentProcessor;
