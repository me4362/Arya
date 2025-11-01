// modules/messageHandler.js - TAMAMEN DÜZELTİLMİŞ SÜRÜM
const logger = require('./logger');
const messageParser = require('./messageHandler/messageParser');
const sessionRouter = require('./messageHandler/sessionRouter');
const contactManager = require('./messageHandler/contactManager');
const validation = require('./messageHandler/validation');
const errorHandler = require('./messageHandler/errorHandler');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// Global servis durumu değişkeni - basit çözüm
let serviceFound = false;

// ✅ DÜZELTİLDİ: Akıllı Buffer Yönetimi için global değişkenler
const userBufferStates = new Map();

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

// ✅ TAMAMEN YENİ: Buffer State Yönetimi - TÜM HATALAR DÜZELTİLDİ
function getUserBufferState(userId) {
  if (!userBufferStates.has(userId)) {
    userBufferStates.set(userId, {
      lastMessageTime: Date.now(),
      messageCount: 0,
      totalWaitTime: 0,
      isWaitingForCompletion: false,
      lastMessageLength: 0,
      lastUpdateTime: Date.now(),
      conversationStarted: false,
      firstMessageTime: Date.now() // ✅ YENİ: İlk mesaj zamanı
    });
  }
  return userBufferStates.get(userId);
}

// ✅ TAMAMEN YENİ: Akıllı Bekleme Süresi Hesaplama - GERÇEK BEKLEME
function calculateSmartWaitTime(message, userId, isFirstMessage = false) {
  const bufferState = getUserBufferState(userId);
  const now = Date.now();
  
  const timeSinceFirstMessage = now - bufferState.firstMessageTime;
  const messageLength = message.length;
  
  console.log(`⏱️  GERÇEK SÜRE HESAPLAMA: Mesaj=${messageLength}karakter, İlkMesaj=${timeSinceFirstMessage}ms önce, Sayı=${bufferState.messageCount}`);
  
  // ✅ KRİTİK DÜZELTME: İLK MESAJ MUTLAKA BEKLESİN
  if (isFirstMessage || bufferState.messageCount === 0) {
    console.log(`🎯 İLK MESAJ: 18sn sabit bekle`);
    return 18000; // İlk mesaj 18 saniye beklesin
  }
  
  // 1. KADEME - Hızlı devam
  if (timeSinceFirstMessage < 10000 && messageLength < 25) {
    return 12000;
  }
  
  // 2. KADEME - Uzun mesaj tespiti
  if (messageLength > 30) {
    console.log(`📝 UZUN MESAJ: 22sn bekle`);
    return 22000;
  }
  
  // 3. KADEME - Maksimum bekleme kontrolü
  const remainingTime = 45000 - bufferState.totalWaitTime;
  if (remainingTime < 15000) {
    console.log(`⏰ MAKSİMUM YAKIN: ${remainingTime}ms kaldı`);
    return Math.max(10000, remainingTime);
  }
  
  // 4. Varsayılan
  return 15000;
}

// ✅ TAMAMEN YENİ: Buffer State Güncelleme - GERÇEK ZAMAN TAKİBİ
function updateBufferState(userId, message, waitTimeUsed = 0, isNewMessage = true) {
  const bufferState = getUserBufferState(userId);
  const now = Date.now();
  
  if (isNewMessage) {
    bufferState.lastMessageTime = now;
    bufferState.conversationStarted = true;
    bufferState.messageCount += 1;
  }
  
  bufferState.lastUpdateTime = now;
  bufferState.totalWaitTime += waitTimeUsed;
  bufferState.lastMessageLength = message.length;
  bufferState.isWaitingForCompletion = waitTimeUsed > 0;
  
  console.log(`🔄 GERÇEK DURUM: Mesaj#${bufferState.messageCount}, ToplamBekleme=${bufferState.totalWaitTime}ms, İlkMesaj=${now - bufferState.firstMessageTime}ms önce`);
  
  if (bufferState.totalWaitTime >= 45000) {
    console.log(`🔄 OTOMATİK RESET: 45sn doldu`);
    resetBufferState(userId);
  }
}

// ✅ GÜNCELLENDİ: Buffer State Reset
function resetBufferState(userId) {
  userBufferStates.set(userId, {
    lastMessageTime: Date.now(),
    messageCount: 0,
    totalWaitTime: 0,
    isWaitingForCompletion: false,
    lastMessageLength: 0,
    lastUpdateTime: Date.now(),
    conversationStarted: false,
    firstMessageTime: Date.now()
  });
  console.log(`🔄 BUFFER SIFIRLANDI: ${userId}`);
}

// ✅ GÜNCELLENDİ: ÖZEL KOMUT KONTROLÜ - SADECE GERÇEK KOMUTLAR
function isImmediateCommand(message) {
  const immediateCommands = [
    'menü', 'menu', 'yardım', 'yardim', 'help', 
    'çıkış', 'çıkıs', 'exit', 'geri', 'back',
    'iptal', 'cancel',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  
  const isPersonName = /(bey|hanım|hanim|efendi)$/.test(cleanMessage) && cleanMessage.split(' ').length <= 3;
  const isSingleWord = cleanMessage.split(' ').length === 1 && cleanMessage.length <= 10;
  const isShortExpression = cleanMessage.length <= 3 || /^[👍👋✅❌👌🤔]+$/.test(cleanMessage);

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

// ✅ TAMAMEN YENİ: BUFFER BİRLEŞTİRME KARARI - GERÇEK MANTIK
function shouldCombineMessages(newMessage, existingBuffer, userId) {
  if (existingBuffer.length === 0) {
    console.log(`📭 BUFFER BOŞ: Birleştirme YOK`);
    return false; // ✅ KRİTİK: İlk mesajda birleştirme YOK
  }
  
  const lastMessage = existingBuffer[existingBuffer.length - 1];
  const bufferState = getUserBufferState(userId);
  
  console.log(`🔍 GERÇEK ANALİZ: Son="${lastMessage}", Yeni="${newMessage}"`);
  
  // 1. ZAMANSAL YAKINLIK - GERÇEK KONTROL
  const timeSinceFirstMessage = Date.now() - bufferState.firstMessageTime;
  const isRecentConversation = timeSinceFirstMessage < 30000; // 30 saniye içinde
  
  // 2. KONUŞMA AKIŞI ANALİZİ
  const isConversationContinuation = (
    // Soru-cevap
    (lastMessage.includes('?') && newMessage.length < 50) ||
    // Onay/red
    newMessage.startsWith('evet') || newMessage.startsWith('hayır') ||
    newMessage.startsWith('tamam') || newMessage.startsWith('peki') ||
    // Bağlaçlar
    newMessage.startsWith('ve ') || newMessage.startsWith('bir de') ||
    newMessage.startsWith('sonra') || newMessage.startsWith('ama') ||
    // Kısa cevaplar
    newMessage.length <= 20
  );
  
  // 3. MESAJ YAPISI
  const isShortResponse = newMessage.split(' ').length <= 4;
  const isQuestionAnswer = lastMessage.includes('?') && !newMessage.includes('?');
  
  const shouldCombine = isRecentConversation && 
                       (isConversationContinuation || isShortResponse || isQuestionAnswer);
  
  console.log(`📊 GERÇEK KARAR: ` +
    `Zaman=${timeSinceFirstMessage}ms, Akış=${isConversationContinuation}, ` +
    `Kısa=${isShortResponse} → ${shouldCombine ? 'BİRLEŞTİR' : 'BEKLE'}`);
  
  return shouldCombine;
}

// ✅ YENİ FONKSİYON: Kurumsal red mesajı gönder
async function sendServiceNotAvailable(message, serviceRequest = '') {
  let responseText = '';
  
  if (serviceRequest && serviceRequest.trim().length > 0) {
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

// ✅ GÜNCELLENDİ: Birleştirilmiş mesajı işle
async function processCombinedMessage(message, combinedMessage, contactInfo) {
  console.log(`🎯 SON İŞLEM: "${combinedMessage}"`);
  
  // 1. Mesajı ayrıştır
  const parsedMessage = messageParser.parseMessage(combinedMessage);
  
  console.log(`📝 SON AYRIŞTIRMA: Orijinal="${combinedMessage}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
  
  // 2. Kullanıcı cevap verdiğinde tüm timer'ları durdur
  const sessionManager = require('./sessionManager');
  sessionManager.stopHelpTimer(message.from);
  sessionManager.stopMenuTimer(message.from);
  sessionManager.stopMenuGoodbyeTimer(message.from);
  
  // 3. Özel komut kontrolü
  if (isImmediateCommand(combinedMessage)) {
    console.log(`⚡ KOMUT ALGILANDI: "${combinedMessage}"`);
  }
  
  // 4. Oturum durumuna göre yönlendir
  await sessionRouter.route(message, parsedMessage, contactInfo.name, () => {
    serviceFound = true;
    console.log('✅ SERVİS BULUNDU');
  });
  
  // 5. Buffer'ı sadece işlem tamamlandığında resetle
  resetBufferState(message.from);
  
  if (!serviceFound) {
    console.log('🚫 SERVİS BULUNAMADI, RED MESAJI...');
    
    const serviceRequest = parsedMessage.servicePart || combinedMessage;
    await sendServiceNotAvailable(message, serviceRequest);
    
    setTimeout(async () => {
      const serviceLoader = require('./serviceLoader');
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
    }, 30000);
  }
}

// ✅ TAMAMEN YENİ: ANA MESAJ İŞLEME - TÜM DÜZELTMELER
async function handleMessage(message) {
  try {
    serviceFound = false;
    
    // 1. Mesajı doğrula
    const validationResult = validation.validateMessage(message);
    if (!validationResult.isValid) {
      if (validationResult.reason === 'has_media') {
        await errorHandler.handleMediaError(message);
      }
      return;
    }

    // 2. Müşteri bilgilerini al
    const contactInfo = await contactManager.logContactInteraction(message, 'Mesaj alındı');
    
    // 3. Oturumu başlat/güncelle
    const sessionManager = require('./sessionManager');
    let session = sessionManager.getUserSession(message.from);
    
    console.log(`🔍 OTURUM: ${session.currentState}, Mesaj: "${validationResult.messageBody}"`);
    console.log(`📊 BUFFER: ${session.messageBuffer.length} mesaj, İşleniyor: ${session.isProcessingBuffer}`);
    
    // 4. Timer'ları durdur
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    
    // 5. Buffer işleniyorsa bekle
    if (session.isProcessingBuffer) {
      console.log(`⏳ BUFFER İŞLENİYOR, BEKLE...`);
      return;
    }
    
    // 6. AKTİF İŞLEM BYPASS
    if (isActiveProcessState(session.currentState)) {
      console.log(`⚡ AKTİF İŞLEM: Buffer bypass`);
      
      updateBufferState(message.from, validationResult.messageBody, 0, true);
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    // 7. ÖZEL KOMUT BYPASS
    const isSpecialCommand = isImmediateCommand(validationResult.messageBody);
    if (isSpecialCommand) {
      console.log(`⚡ KOMUT: Buffer bypass - "${validationResult.messageBody}"`);
      
      updateBufferState(message.from, validationResult.messageBody, 0, true);
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    // 8. Buffer'a mesaj ekle
    sessionManager.addToMessageBuffer(message.from, validationResult.messageBody);
    
    const bufferStatus = sessionManager.getBufferStatus(message.from);
    console.log(`📥 BUFFER'A EKLENDİ: ${bufferStatus.bufferSize} mesaj -> "${bufferStatus.bufferContent}"`);
    
    // ✅ KRİTİK DÜZELTME: GERÇEK BEKLEME SÜRESİ
    const isFirstMessage = bufferStatus.bufferSize === 1;
    const smartWaitTime = calculateSmartWaitTime(validationResult.messageBody, message.from, isFirstMessage);
    
    // 9. Buffer birleştirme kararı
    const shouldCombine = shouldCombineMessages(validationResult.messageBody, session.messageBuffer, message.from);
    
    // ✅ KRİTİK DÜZELTME: İLK MESAJ MUTLAKA BEKLESİN
    if (!isSpecialCommand && bufferStatus.bufferSize === 1 && !shouldCombine) {
      console.log(`⏰ GERÇEK BEKLEME: ${smartWaitTime}ms bekleniyor...`);
      
      updateBufferState(message.from, validationResult.messageBody, smartWaitTime, false);
      return; // ✅ GERÇEK BEKLEME
    }
    
    // 10. Birleştirme veya hemen işleme
    if (isSpecialCommand || bufferStatus.bufferSize > 1 || shouldCombine) {
      const combinedMessage = sessionManager.processMessageBuffer(message.from);
      
      if (combinedMessage) {
        console.log(`🔄 BUFFER İŞLENDİ: "${combinedMessage}"`);
        await processCombinedMessage(message, combinedMessage, contactInfo);
      }
    }
    
  } catch (error) {
    console.log(`❌ MESAJ İŞLEME HATASI: ${error.message}`);
    
    try {
      await sendServiceNotAvailable(message, 'İsteğiniz');
    } catch (finalError) {
      await errorHandler.handleError(message, finalError);
    }
  }
}

// ✅ YENİ FONKSİYON: Hızlı komut işleme
async function processImmediateCommand(message, command) {
  const sessionManager = require('./sessionManager');
  const contactInfo = await contactManager.logContactInteraction(message, 'Hızlı komut işlendi');
  
  sessionManager.stopMenuGoodbyeTimer(message.from);
  sessionManager.stopHelpTimer(message.from);
  
  resetBufferState(message.from);
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