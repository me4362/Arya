// modules/saleFlow/saleManager.js - GÜNCELLENDİ
const logger = require('../logger');
const sessionManager = require('../sessionManager');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendSaleMessage(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    console.error('Satış mesajı gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(text);
  }
}

// Satış teklifi sorma - GÜNCELLENDİ
async function askForSale(message) {
  const saleQuestion = `🎯 *Yeşil Sigorta Poliçenizi hemen düzenleyelim mi?*\n\n` +
                      `Poliçenizi oluşturmak için sadece birkaç bilgiye ihtiyacımız var.\n\n` +
                      `✅ *Evet* - Poliçe oluşturmaya başlayalım\n` +
                      `❌ *Hayır* - Şimdilik sadece fiyat bilgisi yeterli`;
  
  await sendSaleMessage(message, saleQuestion);
  
  // Satış oturumu başlat
  const timeoutManager = require('./timeoutManager');
  timeoutManager.startSaleTimeout(message.from, message);
}

// Satış teklifi formatları
function getSaleQuestions() {
  return {
    yesil_sigorta: {
      question: `🎯 *Yeşil Sigorta Poliçenizi hemen düzenleyelim mi?*`,
      options: `✅ *Evet* - Poliçe oluşturmaya başlayalım\n❌ *Hayır* - Şimdilik sadece fiyat bilgisi yeterli`
    },
    trafik_sigortasi: {
      question: `🎯 *Trafik Sigortası poliçenizi hemen oluşturalım mı?*`,
      options: `✅ *Evet* - Poliçe oluşturmaya başlayalım\n❌ *Hayır* - Şimdilik sadece fiyat bilgisi yeterli`
    }
  };
}

// Servise özel satış sorusu oluştur - GÜNCELLENDİ
async function askServiceSpecificSale(message, serviceName) {
  const questions = getSaleQuestions();
  const serviceQuestion = questions[serviceName] || questions['yesil_sigorta'];
  
  const saleQuestion = `${serviceQuestion.question}\n\n${serviceQuestion.options}`;
  
  await sendSaleMessage(message, saleQuestion);
  
  // Satış oturumu başlat
  const timeoutManager = require('./timeoutManager');
  timeoutManager.startSaleTimeout(message.from, message);
}

module.exports = {
  askForSale,
  askServiceSpecificSale,
  getSaleQuestions
};