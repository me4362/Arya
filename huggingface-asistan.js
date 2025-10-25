// huggingface-asistan.js - TÜRKÇE BERT İLE
const fetch = require('node-fetch');

class HuggingFaceAsistan {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || "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"; // Token from env or fallback
    this.model = process.env.HUGGINGFACE_MODEL || "akdeniz27/bert-base-turkish-cased-ner"; // TÜRKÇE BERT
  }

  async generateResponse(userMessage, userId = "default") {
    try {
      console.log(`🤖 Türkçe BERT'e sorgu: "${userMessage}"`);

      // BERT için farklı bir API endpoint'i kullanıyoruz
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.model}`,
        {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            inputs: {
              "source_sentence": userMessage,
              "sentences": [
                "sigorta talebi",
                "emlak ilanı", 
                "yazılım hizmeti",
                "enerji danışmanlığı",
                "genel soru"
              ]
            }
          })
        }
      );

      console.log("📡 Status:", response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        console.log("📊 BERT Yanıtı:", data);
        
        // BERT benzerlik skorlarını işle
        return this.processBertResponse(data, userMessage);
      } else {
        console.log("❌ BERT Hatası:", response.status);
        return this.getSmartFallback(userMessage);
      }
      
    } catch (error) {
      console.error("❌ BERT Bağlantı Hatası:", error.message);
      return this.getSmartFallback(userMessage);
    }
  }

  processBertResponse(bertScores, userMessage) {
    // BERT benzerlik skorlarını işle
    // bertScores: [0.8, 0.6, 0.3, 0.2, 0.1] gibi bir dizi
    
    if (!bertScores || !Array.isArray(bertScores)) {
      return this.getSmartFallback(userMessage);
    }

    const categories = ["sigorta", "emlak", "yazilim", "enerji", "genel"];
    const maxScore = Math.max(...bertScores);
    const bestMatchIndex = bertScores.indexOf(maxScore);
    const bestCategory = categories[bestMatchIndex];

    console.log(`🎯 BERT Tahmini: ${bestCategory} (skor: ${maxScore})`);

    // En yüksek skora göre yanıt ver
    return this.getCategoryResponse(bestCategory, userMessage);
  }

  getCategoryResponse(category, message) {
    const lowerMessage = message.toLowerCase();
    
    switch(category) {
      case "sigorta":
        if (lowerMessage.includes('trafik')) {
          return 'Trafik sigortası teklifi için aracınızın plakasını öğrenebilir miyim? 🚗';
        }
        if (lowerMessage.includes('kasko')) {
          return 'Kasko sigortası için aracınızın marka ve modelini sorabilir miyim? 🛡️';
        }
        return 'Sigorta hizmetlerimiz hakkında size nasıl yardımcı olabilirim? 🛡️ Trafik, kasko veya DASK?';
      
      case "emlak":
        if (lowerMessage.includes('kira')) {
          return 'Kiralık konut için hangi lokasyonda ve ne büyüklükte daire arıyorsunuz? 🏠';
        }
        return 'Emlak hizmetlerimizle ilgili yardımcı olabilirim. 🏠 Kiralık mı satılık mı?';
      
      case "yazilim":
        return 'Yazılım geliştirme hizmetlerimiz için size özel çözüm sunabiliriz! 💻 Mobil uygulama mı web sitesi mi?';
      
      case "enerji":
        return 'Güneş enerjisi çözümlerimiz hakkında detaylı bilgi verebilirim ☀️ Kurulum mu danışmanlık mı?';
      
      default:
        return 'Size nasıl yardımcı olabilirim? 🌟 Sigorta, emlak, enerji veya yazılım hizmetlerimiz hakkında bilgi alabilirsiniz.';
    }
  }

  getSmartFallback(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('sigorta')) {
      return 'Sigorta hizmetlerimiz hakkında bilgi verebilirim! 🛡️';
    }
    if (lowerMessage.includes('kira') || lowerMessage.includes('emlak')) {
      return 'Emlak hizmetlerimizle ilgili yardımcı olabilirim. 🏠';
    }
    if (lowerMessage.includes('yazılım') || lowerMessage.includes('yazilim')) {
      return 'Yazılım geliştirme hizmetlerimiz için bilgi alabilirsiniz! 💻';
    }
    if (lowerMessage.includes('enerji') || lowerMessage.includes('güneş')) {
      return 'Güneş enerjisi çözümlerimiz hakkında detaylı bilgi verebilirim ☀️';
    }
    
    return 'Size nasıl yardımcı olabilirim? 🌟';
  }
}

module.exports = HuggingFaceAsistan;