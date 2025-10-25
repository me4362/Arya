// modules/messageHandler.js - BASİTLEŞTİRİLMİŞ VERSİYON
const logger = require('./logger');
const messageParser = require('./messageHandler/messageParser');
const sessionRouter = require('./messageHandler/sessionRouter');
const contactManager = require('./messageHandler/contactManager');
const validation = require('./messageHandler/validation');
const errorHandler = require('./messageHandler/errorHandler');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// Hugging Face Asistanını ekle
const HuggingFaceAsistan = require('../huggingface-asistan');
const hfAsistan = new HuggingFaceAsistan();

// Global servis durumu değişkeni - basit çözüm
let serviceFound = false;

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendReply(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
    logger.info(`📤 Mesaj gönderildi (alıntısız): ${message.from}`);
  } catch (error) {
    logger.error(`Mesaj gönderme hatası: ${error.message}`);
    // Fallback: normal reply kullan
    try {
      await message.reply(text);
    } catch (fallbackError) {
      logger.error(`Fallback mesaj gönderme de başarısız: ${fallbackError.message}`);
    }
  }
}

// Hugging Face ile yanıt oluştur
async function generateHuggingFaceResponse(message) {
  try {
    console.log('🤖 Hugging Face ile yanıt oluşturuluyor...');
    const hfResponse = await hfAsistan.generateResponse(message.body);
    console.log(`💬 Hugging Face Yanıtı: "${hfResponse}"`);
    await sendReply(message, hfResponse);
    return true;
  } catch (hfError) {
    console.error('❌ Hugging Face yanıt hatası:', hfError);
    return false;
  }
}

// Servis durumunu kontrol et (basit fonksiyon)
function checkServiceFound() {
  return serviceFound;
}

// Ana mesaj işleme fonksiyonu - BASİTLEŞTİRİLMİŞ
async function handleMessage(message) {
  try {
    // Servis bulma durumunu sıfırla
    serviceFound = false;
    console.log(`🔍 Servis bulundu durumu: ${serviceFound}`);
    
    // 1. Mesajı doğrula
    const validationResult = validation.validateMessage(message);
    if (!validationResult.isValid) {
      if (validationResult.reason === 'has_media') {
        await errorHandler.handleMediaError(message);
      }
      return;
    }

    // 2. Müşteri bilgilerini al ve logla
    const contactInfo = await contactManager.logContactInteraction(message, 'Mesaj alındı');
    
    // 3. Oturumu başlat/güncelle
    const sessionManager = require('./sessionManager');
    let session = sessionManager.getUserSession(message.from);
    
    console.log(`🔍 Oturum durumu: ${session.currentState}, Mesaj: "${validationResult.messageBody}"`);
    
    // 4. Kullanıcı cevap verdiğinde tüm timer'ları durdur
    sessionManager.stopHelpTimer(message.from);
    sessionManager.stopMenuTimer(message.from);
    
    // 5. Mesajı ayrıştır
    const parsedMessage = messageParser.parseMessage(validationResult.messageBody);
    
    console.log(`📝 Mesaj ayrıştırma: Orijinal="${validationResult.messageBody}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
    
    // 6. Oturum durumuna göre yönlendir
    await sessionRouter.route(message, parsedMessage, contactInfo.name, () => {
      // Callback: servis bulunduğunda çağrılacak
      serviceFound = true;
      console.log('✅ Servis bulundu - Hugging Face atlanacak');
    });
    
    // 7. Eğer modüler sistem servis bulamazsa, Hugging Face'e yönlendir
    if (!serviceFound) {
      console.log('🔍 Modüler sistem servis bulamadı, Hugging Face deneniyor...');
      const hfSuccess = await generateHuggingFaceResponse(message);
      
      if (!hfSuccess) {
        // Hugging Face de başarısız olursa genel hata mesajı
        await sendReply(message, '❌ Üzgünüm, bu konuda size yardımcı olamadım. Lütfen başka bir soru sormayı deneyin veya "yardım" yazarak hizmetlerimizi görün.');
      }
    }
    
  } catch (error) {
    console.log(`❌ Mesaj işleme hatası: ${error.message}`);
    
    // Hata durumunda Hugging Face'i dene
    console.log('🔄 Hata durumunda Hugging Face deneniyor...');
    try {
      const hfSuccess = await generateHuggingFaceResponse(message);
      if (!hfSuccess) {
        await errorHandler.handleError(message, error);
      }
    } catch (finalError) {
      await errorHandler.handleError(message, finalError);
    }
  }
}

module.exports = {
  handleMessage,
  sendReply,
  checkServiceFound,
  generateHuggingFaceResponse,
  getTimeBasedGreeting: require('./messageHandler/greetingManager').getTimeBasedGreeting,
  isGreeting: messageParser.isGreeting,
  parseMessage: messageParser.parseMessage,
  handleGreeting: require('./messageHandler/greetingManager').handleGreeting,
  findMatchingService: require('./messageHandler/serviceMatcher').findMatchingService,
  createPersonalizedGreeting: require('./messageHandler/personalization').createPersonalizedGreeting
};