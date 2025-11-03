// modules/messageHandler.js - BASİTLEŞTİRİLMİŞ VERSİYON (BUFFER BYPASS'LAR KALDIRILDI)
const logger = require('./logger');
const messageParser = require('./messageHandler/messageParser');
const sessionRouter = require('./messageHandler/sessionRouter');
const contactManager = require('./messageHandler/contactManager');
const validation = require('./messageHandler/validation');
const errorHandler = require('./messageHandler/errorHandler');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

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

// ✅ YENİ FONKSİYON: Kurumsal red mesajı gönder
async function sendServiceNotAvailable(message, serviceRequest = '') {
  let responseText = '';
  
  if (serviceRequest && serviceRequest.trim().length > 0) {
    // Spesifik hizmet için red mesajı
    responseText = `🚫 *Değerli müşterimiz,*\n\n` +
                  `"${serviceRequest}" konusunda şu an hizmet verememekteyiz. ` +
                  `Anlayışınız için teşekkür ederiz.\n\n` +
                  `📍 *Size yardımcı olabileceğimiz hizmetler:*\n` +
                  `• Sigorta hizmetleri\n` +
                  `• Yazılım geliştirme\n` +
                  `• Siber güvenlik\n` +
                  `• Lojistik hizmetleri\n` +
                  `• İthalat/ihracat\n` +
                  `• Ve diğer profesyonel hizmetler\n\n` +
                  `ℹ️ Tüm hizmetlerimizi görmek için *"menü"* yazabilirsiniz.`;
  } else {
    // Genel red mesajı
    responseText = `🚫 *Değerli müşterimiz,*\n\n` +
                  `İstediğiniz konuda şu an hizmet verememekteyiz. ` +
                  `Anlayışınız için teşekkür ederiz.\n\n` +
                  `📍 *Size yardımcı olabileceğimiz hizmetler:*\n` +
                  `• Sigorta hizmetleri\n` +
                  `• Yazılım geliştirme\n` +
                  `• Siber güvenlik\n` +
                  `• Lojistik hizmetleri\n` +
                  `• İthalat/ihracat\n` +
                  `• Ve diğer profesyonel hizmetler\n\n` +
                  `ℹ️ Tüm hizmetlerimizi görmek için *"menü"* yazabilirsiniz.`;
  }
  
  await sendReply(message, responseText);
  console.log(`🚫 Kurumsal red mesajı gönderildi: "${serviceRequest.substring(0, 50)}..."`);
}

// Servis durumunu kontrol et (basit fonksiyon)
function checkServiceFound() {
  return serviceFound;
}

// ✅ YENİ FONKSİYON: Manuel buffer işleme
async function processUserMessageBuffer(userId, message) {
  try {
    const sessionManager = require('./sessionManager');
    const combinedMessage = sessionManager.forceProcessBuffer(userId);
    
    if (combinedMessage) {
      console.log(`🎯 Manuel buffer işleme: "${combinedMessage}" - Kullanıcı: ${userId}`);
      
      // Müşteri bilgilerini al
      const contactInfo = await contactManager.logContactInteraction(message, 'Buffer işlendi');
      
      // Mesajı ayrıştır
      const parsedMessage = messageParser.parseMessage(combinedMessage);
      
      console.log(`📝 Manuel ayrıştırma: Orijinal="${combinedMessage}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
      
      // Oturum durumuna göre yönlendir
      await sessionRouter.route(message, parsedMessage, contactInfo.name, () => {
        serviceFound = true;
        console.log('✅ Servis bulundu - Manuel işleme');
      });
      
      // Eğer modüler sistem servis bulamazsa, KURUMSAL RED MESAJI gönder
      if (!serviceFound) {
        console.log('🚫 Servis bulunamadı, kurumsal red mesajı gönderiliyor...');
        
        const serviceRequest = parsedMessage.servicePart || combinedMessage;
        await sendServiceNotAvailable(message, serviceRequest);
        
        // Ana menüye dön - 30 SANİYE BEKLE
        setTimeout(async () => {
          const serviceLoader = require('./serviceLoader');
          const menuHandler = require('./menuHandler');
          await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
        }, 30000);
      }
    }
  } catch (error) {
    console.log(`❌ Manuel buffer işleme hatası: ${error.message}`);
    await errorHandler.handleError(message, error);
  }
}

// ✅ GÜNCELLENDİ: Ana mesaj işleme fonksiyonu - TÜM BYPASS'LAR KALDIRILDI
async function handleMessage(message) {
  try {
    // Servis bulma durumunu sıfırla
    serviceFound = false;
    
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
    console.log(`📊 Buffer durumu: ${session.messageBuffer.length} mesaj, İşleniyor: ${session.isProcessingBuffer}`);
    
    // ✅ DEĞİŞİKLİK: Kullanıcı mesaj gönderdiğinde MENÜ TIMER'INI DURDUR
    sessionManager.stopMenuGoodbyeTimer(message.from);
    
    // ✅ DEĞİŞİKLİK: Yardım timer'ını durdur (mevcut sistemle uyumluluk)
    sessionManager.stopHelpTimer(message.from);
    
    // 4. Buffer kontrolü - eğer buffer işleniyorsa bekle
    if (session.isProcessingBuffer) {
      console.log(`⏳ Buffer işleniyor, yeni mesaj bekleniyor...`);
      return;
    }
    
    // ✅✅✅ DEĞİŞİKLİK: TÜM MESAJLAR BUFFER'A EKLENECEK - HİÇBİR BYPASS YOK
    sessionManager.addToMessageBuffer(message.from, validationResult.messageBody);
    
    const bufferStatus = sessionManager.getBufferStatus(message.from);
    console.log(`📥 Buffer'a eklendi: ${bufferStatus.bufferSize} mesaj -> "${bufferStatus.bufferContent}"`);
    
    // ✅✅✅ DEĞİŞİKLİK: HİÇBİR MESAJ HEMEN İŞLENMEYECEK - SADECE TIMER BİTİNCE İŞLENECEK
    console.log(`⏰ Mesaj buffer'da bekletiliyor (${bufferStatus.bufferSize} mesaj)...`);
    
  } catch (error) {
    console.log(`❌ Mesaj işleme hatası: ${error.message}`);
    
    // Hata durumunda kurumsal mesaj gönder
    console.log('🔄 Hata durumunda kurumsal mesaj gönderiliyor...');
    try {
      await sendServiceNotAvailable(message, 'İsteğiniz');
    } catch (finalError) {
      await errorHandler.handleError(message, finalError);
    }
  }
}

// ✅ YENİ FONKSİYON: Özel durumlar için manuel işleme (menü, yardım vb.)
async function handleImmediateCommand(message, command) {
  try {
    console.log(`⚡ Özel komut işleniyor: "${command}" - Kullanıcı: ${message.from}`);
    
    const sessionManager = require('./sessionManager');
    
    // Buffer'ı temizle ve timer'ı durdur
    sessionManager.clearMessageBuffer(message.from);
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    
    // Özel komutları işle
    const cleanCommand = command.toLowerCase().trim();
    
    if (cleanCommand.includes('menü') || cleanCommand.includes('menu') || cleanCommand === '0') {
      const serviceLoader = require('./serviceLoader');
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
      return true;
    }
    
    if (cleanCommand.includes('yardım') || cleanCommand.includes('yardim') || cleanCommand.includes('help')) {
      await sendReply(message, `🆘 *Yardım Merkezi*\n\n` +
        `• *"menü"* yazarak tüm hizmetlerimizi görebilirsiniz\n` +
        `• *"0"* yazarak ana menüye dönebilirsiniz\n` +
        `• İstediğiniz hizmeti yazarak doğrudan ulaşabilirsiniz\n\n` +
        `📍 Örnek: "sigorta", "yazılım", "lojistik"`);
      return true;
    }
    
    if (cleanCommand.includes('iptal') || cleanCommand.includes('cancel') || cleanCommand.includes('çıkış') || cleanCommand.includes('çıkıs')) {
      await sendReply(message, `👋 İşleminiz iptal edildi. Ana menüye yönlendiriliyorsunuz...`);
      
      const serviceLoader = require('./serviceLoader');
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Özel komut işleme hatası: ${error.message}`);
    return false;
  }
}

module.exports = {
  handleMessage,
  sendReply,
  checkServiceFound,
  getTimeBasedGreeting: require('./messageHandler/greetingManager').getTimeBasedGreeting,
  isGreeting: messageParser.isGreeting,
  parseMessage: messageParser.parseMessage,
  handleGreeting: require('./messageHandler/greetingManager').handleGreeting,
  findMatchingService: require('./messageHandler/serviceMatcher').findMatchingService,
  createPersonalizedGreeting: require('./messageHandler/personalization').createPersonalizedGreeting,
  
  // ✅ YENİ/GÜNCELLENMİŞ FONKSİYONLAR
  sendServiceNotAvailable,
  processUserMessageBuffer,
  handleImmediateCommand
};