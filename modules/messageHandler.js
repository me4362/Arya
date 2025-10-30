[file content begin]
// modules/messageHandler.js - BUFFER SİSTEMİ + KURUMSAL MESAJ EKLENDİ
const logger = require('./logger');
const messageParser = require('./messageHandler/messageParser');
const sessionRouter = require('./messageHandler/sessionRouter');
const contactManager = require('./messageHandler/contactManager');
const validation = require('./messageHandler/validation');
const errorHandler = require('./messageHandler/errorHandler');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// ❌ HUGGING FACE KALDIRILDI
// const HuggingFaceAsistan = require('../huggingface-asistan');
// const hfAsistan = new HuggingFaceAsistan();

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

// ❌ HUGGING FACE FONKSİYONU KALDIRILDI
// async function generateHuggingFaceResponse(message) { ... }

// Servis durumunu kontrol et (basit fonksiyon)
function checkServiceFound() {
  return serviceFound;
}

// ✅ YENİ FONKSİYON: Özel komut kontrolü
function isImmediateCommand(message) {
  const immediateCommands = [
    'menü', 'menu', 'yardım', 'yardim', 'help', 
    'çıkış', 'çıkıs', 'exit', 'geri', 'back',
    'iptal', 'cancel', 'teşekkür', 'tesekkur', 'sağol', 'sagol'
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return immediateCommands.some(cmd => cleanMessage.includes(cmd));
}

// ✅ YENİ FONKSİYON: Birleştirilmiş mesajı işle
async function processCombinedMessage(message, combinedMessage, contactInfo) {
  console.log(`🎯 Birleştirilmiş mesaj işleniyor: "${combinedMessage}"`);
  
  // 1. Mesajı ayrıştır
  const parsedMessage = messageParser.parseMessage(combinedMessage);
  
  console.log(`📝 Birleştirilmiş mesaj ayrıştırma: Orijinal="${combinedMessage}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
  
  // 2. Kullanıcı cevap verdiğinde tüm timer'ları durdur
  const sessionManager = require('./sessionManager');
  sessionManager.stopHelpTimer(message.from);
  sessionManager.stopMenuTimer(message.from);
  
  // 3. Oturum durumuna göre yönlendir
  await sessionRouter.route(message, parsedMessage, contactInfo.name, () => {
    // Callback: servis bulunduğunda çağrılacak
    serviceFound = true;
    console.log('✅ Servis bulundu - Kurumsal mesaj atlanacak');
  });
  
  // ✅ YENİ: Eğer modüler sistem servis bulamazsa, KURUMSAL RED MESAJI gönder
  if (!serviceFound) {
    console.log('🚫 Servis bulunamadı, kurumsal red mesajı gönderiliyor...');
    
    const serviceRequest = parsedMessage.servicePart || combinedMessage;
    await sendServiceNotAvailable(message, serviceRequest);
    
    // Ana menüye dön
    setTimeout(async () => {
      const serviceLoader = require('./serviceLoader');
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
    }, 3000);
  }
}

// ✅ GÜNCELLENDİ: Ana mesaj işleme fonksiyonu - BUFFER SİSTEMİ EKLENDİ
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
    
    // ✅ YENİ: Buffer kontrolü - eğer buffer işleniyorsa bekle
    if (session.isProcessingBuffer) {
      console.log(`⏳ Buffer işleniyor, yeni mesaj bekleniyor...`);
      return;
    }
    
    // ✅ YENİ: Buffer'a mesaj ekle
    sessionManager.addToMessageBuffer(message.from, validationResult.messageBody);
    
    // Buffer durumunu kontrol et
    const bufferStatus = sessionManager.getBufferStatus(message.from);
    console.log(`📥 Buffer'a eklendi: ${bufferStatus.bufferSize} mesaj -> "${bufferStatus.bufferContent}"`);
    
    // Eğer buffer'da 1'den fazla mesaj varsa veya bu özel bir komut değilse, timer'ı bekleyelim
    const isSpecialCommand = isImmediateCommand(validationResult.messageBody);
    
    if (!isSpecialCommand && bufferStatus.bufferSize === 1) {
      console.log(`⏰ İlk mesaj, 35 saniye bekleniyor...`);
      return; // Timer bitene kadar bekle
    }
    
    // Özel komutlar veya timer bitince işle
    if (isSpecialCommand || bufferStatus.bufferSize > 1) {
      // Buffer'ı hemen işle
      const combinedMessage = sessionManager.processMessageBuffer(message.from);
      
      if (combinedMessage) {
        console.log(`🔄 Buffer işlendi: "${combinedMessage}"`);
        await processCombinedMessage(message, combinedMessage, contactInfo);
      }
    }
    
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
  
  // ✅ YENİ FONKSİYONLAR
  sendServiceNotAvailable,
  isImmediateCommand,
  processCombinedMessage
};
