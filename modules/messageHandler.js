// modules/messageHandler.js - BUFFER SİSTEMİ + KURUMSAL MESAJ + MENÜ TIMER + ÇİFT MENÜ KORUMASI + AKILLI BİRLEŞTİRME + GELİŞMİŞ KOMUT KONTROLÜ
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

// ✅ GELİŞTİRİLMİŞ ÖZEL KOMUT KONTROLÜ - KİŞİ İSİMLERİ BYPASS EKLENDİ
function isImmediateCommand(message) {
  const immediateCommands = [
    'menü', 'menu', 'yardım', 'yardim', 'help', 
    'çıkış', 'çıkıs', 'exit', 'geri', 'back',
    'iptal', 'cancel', 'teşekkür', 'tesekkur', 'sağol', 'sagol',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', // Sayılar
    'evet', 'hayır', 'tamam', 'ok', 'peki', 'olur', 'yok' // Hızlı cevaplar
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  
  // ✅ YENİ: Kişi isimlerini komut olarak görme (Mehmet bey, Ahmet bey vb.)
  const isPersonName = /(bey|hanım|hanim|efendi)$/.test(cleanMessage) && cleanMessage.split(' ').length <= 3;
  
  // ✅ YENİ: Tek kelime mesajları kontrol et (büyük olasılıkla komuttur)
  const isSingleWord = cleanMessage.split(' ').length === 1 && cleanMessage.length <= 15;
  
  // ✅ YENİ: Emoji veya kısa ifadeler
  const isShortExpression = cleanMessage.length <= 5 || /^[👍👋✅❌👌🤔]+$/.test(cleanMessage);
  
  return immediateCommands.some(cmd => cleanMessage.includes(cmd)) || 
         isPersonName || 
         isSingleWord || 
         isShortExpression;
}

// ✅ YENİ FONKSİYON: Aktif işlem durumunu kontrol et
function isActiveProcessState(state) {
  const activeStates = [
    'waiting_for_service',
    'waiting_for_response', 
    'service_flow',
    'question_flow',
    'collecting_info',
    'processing_order',
    'payment_pending',
    'confirmation_pending'
  ];
  
  return activeStates.some(activeState => state.includes(activeState));
}

// ✅ GELİŞTİRİLMİŞ BUFFER BİRLEŞTİRME KARARI - AKILLI ANALİZ
function shouldCombineMessages(newMessage, existingBuffer, userId) {
  if (existingBuffer.length === 0) return false;
  
  const lastMessage = existingBuffer[existingBuffer.length - 1];
  
  console.log(`🔍 AKILLI KONU ANALİZİ: Son="${lastMessage}", Yeni="${newMessage}"`);
  
  // 1. GRAMER VE SOHBET ANALİZİ
  const isConversationContinuation = (
    // Soru-cevap akışı
    (lastMessage.includes('?') && newMessage.length < 50) ||
    // Onay/red akışı
    newMessage.startsWith('evet') || newMessage.startsWith('hayır') ||
    newMessage.startsWith('tamam') || newMessage.startsWith('peki') ||
    newMessage.startsWith('olur') || newMessage.startsWith('yok') ||
    // Bağlaçlarla devam
    newMessage.startsWith('sonra') || newMessage.startsWith('yani') ||
    newMessage.startsWith('ama') || newMessage.startsWith('veya') ||
    newMessage.startsWith('ve ') || newMessage.startsWith('bir de') ||
    newMessage.startsWith('önce') || newMessage.startsWith('şimdi') ||
    newMessage.startsWith('daha ') || newMessage.startsWith('hemen ') ||
    newMessage.startsWith('şu ') || newMessage.startsWith('bu ') ||
    // Eksik cümle tamamlama
    lastMessage.endsWith(',') || lastMessage.endsWith('ve') ||
    lastMessage.endsWith('ama') || lastMessage.endsWith('sonra') ||
    lastMessage.endsWith('ki') || lastMessage.endsWith('da')
  );
  
  // 2. ZAMANSAL YAKINLIK
  const sessionManager = require('./sessionManager');
  const session = sessionManager.getUserSession(userId);
  const timeDiff = Date.now() - session.lastMessageTime;
  const isRecentMessage = timeDiff < 10000; // 10 saniye
  
  // 3. MESAJ YAPISI ANALİZİ
  const isShortResponse = newMessage.split(' ').length <= 5;
  const isQuestionAnswer = lastMessage.includes('?') && !newMessage.includes('?');
  const isQuickConfirmation = newMessage.length <= 20 && 
    (newMessage.includes('evet') || newMessage.includes('hayır') || 
     newMessage.includes('tamam') || newMessage.includes('ok'));
  
  const shouldCombine = (isConversationContinuation || isRecentMessage) && 
                       (isShortResponse || isQuestionAnswer || isQuickConfirmation);
  
  console.log(`📊 AKILLI KARAR: ` +
    `Sohbet=${isConversationContinuation}, Zaman=${isRecentMessage}ms, ` +
    `Kısa=${isShortResponse}, SoruCevap=${isQuestionAnswer} → ${shouldCombine ? 'BİRLEŞTİR' : 'BEKLE'}`);
  
  return shouldCombine;
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

// ✅ GELİŞTİRİLMİŞ FONKSİYON: Birleştirilmiş mesajı işle
async function processCombinedMessage(message, combinedMessage, contactInfo) {
  console.log(`🎯 Birleştirilmiş mesaj işleniyor: "${combinedMessage}"`);
  
  // 1. Mesajı ayrıştır
  const parsedMessage = messageParser.parseMessage(combinedMessage);
  
  console.log(`📝 Birleştirilmiş mesaj ayrıştırma: Orijinal="${combinedMessage}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
  
  // 2. Kullanıcı cevap verdiğinde tüm timer'ları durdur
  const sessionManager = require('./sessionManager');
  sessionManager.stopHelpTimer(message.from);
  sessionManager.stopMenuTimer(message.from);
  sessionManager.stopMenuGoodbyeTimer(message.from);
  
  // 3. Özel komut kontrolü - eğer komut varsa önce işle
  if (isImmediateCommand(combinedMessage)) {
    console.log(`⚡ Birleştirilmiş mesajda özel komut tespit edildi: "${combinedMessage}"`);
  }
  
  // 4. Oturum durumuna göre yönlendir
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

// ✅ GELİŞTİRİLMİŞ ANA MESAJ İŞLEME FONKSİYONU
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
    
    // ✅ Kullanıcı mesaj gönderdiğinde tüm timer'ları durdur
    sessionManager.stopMenuGoodbyeTimer(message.from);
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
    
    // 6. ÖZEL KOMUT BYPASS - Hemen işle
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
    const shouldCombine = shouldCombineMessages(validationResult.messageBody, session.messageBuffer, message.from);
    
    // Eğer buffer'da 1 mesaj varsa ve birleştirme gerekmiyorsa, timer'ı bekleyelim
    if (!isSpecialCommand && bufferStatus.bufferSize === 1 && !shouldCombine) {
      console.log(`⏰ İlk mesaj, optimize süre bekleniyor...`);
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
    console.log('🔄 Hata durumunda kurumsal mesaj gönderiliyor...');
    
    try {
      await sendServiceNotAvailable(message, 'İsteğiniz');
    } catch (finalError) {
      await errorHandler.handleError(message, finalError);
    }
  }
}

// ✅ YENİ FONKSİYON: Hızlı komut işleme (dış modüller için)
async function processImmediateCommand(message, command) {
  const sessionManager = require('./sessionManager');
  const contactInfo = await contactManager.logContactInteraction(message, 'Hızlı komut işlendi');
  
  // Timer'ları durdur
  sessionManager.stopMenuGoodbyeTimer(message.from);
  sessionManager.stopHelpTimer(message.from);
  
  // Komutu hemen işle
  await processCombinedMessage(message, command, contactInfo);
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
  
  // ✅ GELİŞMİŞ FONKSİYONLAR
  sendServiceNotAvailable,
  isImmediateCommand,
  isActiveProcessState,
  shouldCombineMessages,
  processCombinedMessage,
  processImmediateCommand
};