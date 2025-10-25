// modules/messageHandler/errorHandler.js - GÜNCELLENDİ
const logger = require('../logger');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendErrorMessage(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    console.error('Hata mesajı gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(text);
  }
}

async function handleError(message, error) {
  logger.error(`Mesaj işleme hatası: ${error.message}`);
  console.error('❌ Mesaj işlenirken hata:', error);
  
  try {
    await sendErrorMessage(message, '❌ Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
    
    // Hata detayını logla
    const errorDetails = {
      userId: message.from,
      message: message.body,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    logger.error(`Hata detayları: ${JSON.stringify(errorDetails)}`);
    
  } catch (replyError) {
    logger.error(`Hata mesajı gönderilemedi: ${replyError.message}`);
  }
}

async function handleMediaError(message) {
  try {
    await sendErrorMessage(message, '📎 Şu anda sadece metin mesajlarını işleyebiliyorum. Lütfen metin olarak yazın.');
  } catch (error) {
    logger.error(`Medya hatası mesajı gönderilemedi: ${error.message}`);
  }
}

async function handleUnknownCommand(message, contactName = '') {
  const personalization = require('./personalization');
  const unknownText = personalization.createPersonalizedUnknownMessage(contactName);
  
  try {
    await sendErrorMessage(message, `${unknownText}\n\n` +
                       `• "sigorta" - Sigorta hizmetleri\n` +
                       `• "yazılım" - Yazılım geliştirme\n` +
                       `• "lojistik" - Nakliye hizmetleri\n` +
                       `• Veya diğer hizmetlerimiz...\n\n` +
                       `Yardım için "menü" yazabilirsiniz.`);
  } catch (error) {
    logger.error(`Bilinmeyen komut mesajı gönderilemedi: ${error.message}`);
  }
}

module.exports = {
  handleError,
  handleMediaError,
  handleUnknownCommand
};