// modules/messageHandler.js - BUFFER SİSTEMİ + KURUMSAL MESAJ + MENÜ TIMER EKLENDİ + ÇİFT MENÜ KORUMASI
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
  console.log(`🚫 Kurumsal red mesajı gönderildi: "${serviceRequest ? serviceRequest.substring(0, 50) : 'bilinmeyen'}..."`);
}

// Servis durumunu kontrol et (basit fonksiyon)
function checkServiceFound() {
  return serviceFound;
}

// ✅ YENİ FONKSİYON: Özel komut kontrolü
function isImmediateCommand(message) {
  const immediateCommands = [
    'menü', 'menu', 'yardım', 'yardim', 'help', 
    'çıkış', 'çıkıs', 'exit', 'geri', 'back',
    'iptal', 'cancel', 'teşekkür', 'tesekkur', 'sağol', 'sagol',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', // Sayılar
    'evet', 'hayır', 'tamam', 'ok' // Hızlı cevaplar
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return immediateCommands.some(cmd => cleanMessage.includes(cmd));
}

// ✅ YENİ FONKSİYON: Aktif işlem durumunu kontrol et
function isActiveProcessState(state) {
  const activeStates = [
    'waiting_for_service',
    'waiting_for_response', 
    'service_flow',
    'question_flow',
    'collecting_info',
    'processing_order'
  ];
  
  return activeStates.some(activeState => state.includes(activeState));
}

// ✅ YENİ FONKSİYON: Akıllı buffer birleştirme kararı
function shouldCombineMessages(newMessage, existingBuffer) {
  if (existingBuffer.length === 0) return false;
  
  const lastMessage = existingBuffer[existingBuffer.length - 1];
  const combinedText = existingBuffer.join(' ') + ' ' + newMessage;
  
  console.log(`🔍 Buffer analizi: Son mesaj="${lastMessage}", Yeni="${newMessage}"`);
  
  // 1. Kısa mesajlar hemen birleştirilsin (sohbet devamı)
  const isShortSequence = newMessage.length < 20 && lastMessage.length < 20;
  
  // 2. Noktalama ile bitiyorsa veya başlıyorsa birleştir
  const hasPunctuationContinuation = (
    lastMessage.endsWith('.') || 
    lastMessage.endsWith(',') ||
    newMessage.startsWith('ve ') ||
    newMessage.startsWith('ama ') ||
    newMessage.startsWith('sonra ') ||
    newMessage.startsWith('yani ')
  );
  
  // 3. Aynı konu devam ediyorsa birleştir
  const commonTopics = ['sigorta', 'fiyat', 'ücret', 'kasko', 'trafik', 'yeşil', 'yesil', 'hizmet', 'yardım'];
  const hasCommonTopic = commonTopics.some(topic => 
    lastMessage.toLowerCase().includes(topic) && newMessage.toLowerCase().includes(topic)
  );
  
  // 4. Toplam karakter sınırı (çok uzun olmasın)
  const isWithinLengthLimit = combinedText.length < 200;
  
  const shouldCombine = (isShortSequence || hasPunctuationContinuation || hasCommonTopic) && isWithinLengthLimit;
  
  console.log(`📊 Birleştirme kararı: Kısa=${isShortSequence}, Noktalama=${hasPunctuationContinuation}, Konu=${hasCommonTopic}, Uzunluk=${isWithinLengthLimit} → ${shouldCombine ? 'BİRLEŞTİR' : 'BEKLE'}`);
  
  return shouldCombine;
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
  sessionManager.stopMenuGoodbyeTimer(message.from); // ✅ YENİ: Menü timer'ını durdur
  
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
    
    // Ana menüye dön - 30 SANİYE BEKLE
    setTimeout(async () => {
      const serviceLoader = require('./serviceLoader');
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
    }, 30000); // 30 saniye
  }
}

// ✅ GÜNCELLENDİ: Ana mesaj işleme fonksiyonu - MENÜ TIMER DURDURMA EKLENDİ
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
    
    // ✅ DEĞİŞTİ: Kullanıcı mesaj gönderdiğinde MENÜ TIMER'INI DURDUR
    sessionManager.stopMenuGoodbyeTimer(message.from);
    
    // ✅ YENİ: Sadece yardım timer'ını durdur (mevcut sistemle uyumluluk)
    sessionManager.stopHelpTimer(message.from);
    
    // 4. Buffer kontrolü - eğer buffer işleniyorsa bekle
    if (session.isProcessingBuffer) {
      console.log(`⏳ Buffer işleniyor, yeni mesaj bekleniyor...`);
      return;
    }
    
    // 5. AKTİF İŞLEM BYPASS - Eğer kullanıcı aktif işlem yapıyorsa buffer'ı atla
    if (isActiveProcessState(session.currentState)) {
      console.log(`⚡ Aktif işlem tespit edildi - Buffer bypass: ${session.currentState}`);
      
      // Mesajı hemen işle
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    // 6. Özel komut bypass - Hemen işle
    const isSpecialCommand = isImmediateCommand(validationResult.messageBody);
    if (isSpecialCommand) {
      console.log(`⚡ Özel komut tespit edildi - Buffer bypass: "${validationResult.messageBody}"`);
      
      // Mesajı hemen işle
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    // 7. Buffer'a mesaj ekle
    sessionManager.addToMessageBuffer(message.from, validationResult.messageBody);
    
    // Buffer durumunu kontrol et
    const bufferStatus = sessionManager.getBufferStatus(message.from);
    console.log(`📥 Buffer'a eklendi: ${bufferStatus.bufferSize} mesaj -> "${bufferStatus.bufferContent}"`);
    
    // 8. Akıllı buffer birleştirme kararı
    const shouldCombine = shouldCombineMessages(validationResult.messageBody, session.messageBuffer);
    
    // Eğer buffer'da 1 mesaj varsa ve birleştirme gerekmiyorsa, timer'ı bekleyelim
    if (!isSpecialCommand && bufferStatus.bufferSize === 1 && !shouldCombine) {
      console.log(`⏰ İlk mesaj, 7 saniye bekleniyor...`);
      return; // Timer bitene kadar bekle
    }
    
    // Özel komutlar, 2+ mesaj veya birleştirme gerekliyese hemen işle
    if (isSpecialCommand || bufferStatus.bufferSize > 1 || shouldCombine) {
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
  isActiveProcessState,
  shouldCombineMessages,
  processCombinedMessage
};