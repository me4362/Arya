// modules/messageHandler.js - TAMAMEN YENİLENDİ - KURUMSAL SELAMLAMA ENTEGRE
const logger = require('./logger');
const messageParser = require('./messageHandler/messageParser');
const sessionRouter = require('./messageHandler/sessionRouter');
const contactManager = require('./messageHandler/contactManager');
const validation = require('./messageHandler/validation');
const errorHandler = require('./messageHandler/errorHandler');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// Global servis durumu değişkeni
let serviceFound = false;

// Akıllı Buffer Yönetimi
const userBufferStates = new Map();

// Alıntısız mesaj gönderme
async function sendReply(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
    logger.info(`📤 Mesaj gönderildi (alıntısız): ${message.from}`);
  } catch (error) {
    logger.error(`Mesaj gönderme hatası: ${error.message}`);
    try {
      await message.reply(text);
    } catch (fallbackError) {
      logger.error(`Fallback mesaj gönderme de başarısız: ${fallbackError.message}`);
    }
  }
}

// ✅ YENİ: Kurumsal Selamlama Mesajı Gönder
async function sendCorporateGreeting(message, customerName) {
  try {
    const serviceLoader = require('./serviceLoader');
    const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
    const identity = serviceLoader.loadJSON('./genel_diyalog/kimlik_tanitim.json');
    
    // Türkiye saat dilimine göre saat bilgisi
    const now = new Date();
    const turkiyeSaati = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}));
    const saat = turkiyeSaati.getHours();
    
    let greetingMsg = '';
    let timeGreeting = '';
    
    // Saate göre uygun selamlama
    if (saat >= 6 && saat < 12) {
      timeGreeting = 'Günaydın';
    } else if (saat >= 12 && saat < 18) {
      timeGreeting = 'Tünaydın';
    } else {
      timeGreeting = 'İyi akşamlar';
    }
    
    // JSON'daki selamlama mesajlarını kullan
    if (greetings?.selamlama?.merhaba) {
      const randomIndex = Math.floor(Math.random() * greetings.selamlama.merhaba.length);
      greetingMsg = greetings.selamlama.merhaba[randomIndex];
      
      // Kişiselleştir
      greetingMsg = greetingMsg.replace('[İsim]', customerName || 'Değerli Müşterimiz');
      greetingMsg = greetingMsg.replace('[Sabah/Akşam]', timeGreeting);
    } else {
      // Fallback mesaj
      greetingMsg = `${timeGreeting} ${customerName || 'Değerli Müşterimiz'}! 👋\n\nPlanB Global Network Ltd Şti'ye hoş geldiniz. Size nasıl yardımcı olabilirim?`;
    }
    
    // Kimlik tanıtımı ekle
    if (identity?.firma_tanitim) {
      greetingMsg += `\n\n${identity.firma_tanitim}`;
    }
    
    await sendReply(message, greetingMsg);
    console.log(`👋 Kurumsal selamlama gönderildi - Kullanıcı: ${message.from}`);
    
  } catch (error) {
    console.log(`❌ Selamlama mesajı hatası: ${error.message}`);
    // Fallback mesaj
    const fallbackMsg = `Merhaba! 👋\n\nPlanB Global Network Ltd Şti'ye hoş geldiniz. Size nasıl yardımcı olabilirim?`;
    await sendReply(message, fallbackMsg);
  }
}

// ✅ YENİ: Saf Selamlama Kontrolü
function isPureGreeting(message) {
  const cleanMessage = message.toLowerCase().trim();
  
  const greetingWords = [
    'merhaba', 'selam', 'hello', 'hi', 'hey', 'hola',
    'günaydın', 'gunaydin', 'iyi günler', 'tünaydın', 'tunaydin', 
    'iyi akşamlar', 'iyi aksamlar', 'iyi geceler', 'hayırlı akşamlar',
    'naber', 'nbr', 'nasılsın', 'nasilsin', 'nasılsınız', 'nasilsiniz',
    'iyi misin', 'iyimisin'
  ];
  
  const isGreeting = greetingWords.some(word => cleanMessage.includes(word));
  const isShortMessage = cleanMessage.split(' ').length <= 4;
  const hasNoServiceKeywords = !cleanMessage.includes('sigorta') && 
                              !cleanMessage.includes('fiyat') && 
                              !cleanMessage.includes('yardım') && 
                              !cleanMessage.includes('hizmet');
  
  console.log(`🔍 SELAMLAMA KONTROL: "${cleanMessage}" -> Greeting=${isGreeting}, Kısa=${isShortMessage}, ServisYok=${hasNoServiceKeywords}`);
  
  return isGreeting && isShortMessage && hasNoServiceKeywords;
}

// Buffer State Yönetimi
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
      firstMessageTime: Date.now()
    });
  }
  return userBufferStates.get(userId);
}

// Akıllı Bekleme Süresi Hesaplama
function calculateSmartWaitTime(message, userId, isFirstMessage = false) {
  const bufferState = getUserBufferState(userId);
  const now = Date.now();
  
  const timeSinceFirstMessage = now - bufferState.firstMessageTime;
  const messageLength = message.length;
  
  console.log(`⏱️  GERÇEK SÜRE HESAPLAMA: Mesaj=${messageLength}karakter, İlkMesaj=${timeSinceFirstMessage}ms önce, Sayı=${bufferState.messageCount}`);
  
  // İLK MESAJ MUTLAKA BEKLESİN
  if (isFirstMessage || bufferState.messageCount === 0) {
    console.log(`🎯 İLK MESAJ: 18sn sabit bekle`);
    return 18000;
  }
  
  if (timeSinceFirstMessage < 10000 && messageLength < 25) {
    return 12000;
  }
  
  if (messageLength > 30) {
    console.log(`📝 UZUN MESAJ: 22sn bekle`);
    return 22000;
  }
  
  const remainingTime = 45000 - bufferState.totalWaitTime;
  if (remainingTime < 15000) {
    console.log(`⏰ MAKSİMUM YAKIN: ${remainingTime}ms kaldı`);
    return Math.max(10000, remainingTime);
  }
  
  return 15000;
}

// Buffer State Güncelleme
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

// Buffer State Reset
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

// Özel Komut Kontrolü
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

// Aktif işlem durumunu kontrol et
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

// Buffer Birleştirme Kararı
function shouldCombineMessages(newMessage, existingBuffer, userId) {
  if (existingBuffer.length === 0) {
    console.log(`📭 BUFFER BOŞ: Birleştirme YOK`);
    return false;
  }
  
  const lastMessage = existingBuffer[existingBuffer.length - 1];
  const bufferState = getUserBufferState(userId);
  
  console.log(`🔍 GERÇEK ANALİZ: Son="${lastMessage}", Yeni="${newMessage}"`);
  
  const timeSinceFirstMessage = Date.now() - bufferState.firstMessageTime;
  const isRecentConversation = timeSinceFirstMessage < 30000;
  
  const isConversationContinuation = (
    (lastMessage.includes('?') && newMessage.length < 50) ||
    newMessage.startsWith('evet') || newMessage.startsWith('hayır') ||
    newMessage.startsWith('tamam') || newMessage.startsWith('peki') ||
    newMessage.startsWith('ve ') || newMessage.startsWith('bir de') ||
    newMessage.startsWith('sonra') || newMessage.startsWith('ama') ||
    newMessage.length <= 20
  );
  
  const isShortResponse = newMessage.split(' ').length <= 4;
  const isQuestionAnswer = lastMessage.includes('?') && !newMessage.includes('?');
  
  const shouldCombine = isRecentConversation && 
                       (isConversationContinuation || isShortResponse || isQuestionAnswer);
  
  console.log(`📊 GERÇEK KARAR: ` +
    `Zaman=${timeSinceFirstMessage}ms, Akış=${isConversationContinuation}, ` +
    `Kısa=${isShortResponse} → ${shouldCombine ? 'BİRLEŞTİR' : 'BEKLE'}`);
  
  return shouldCombine;
}

// Kurumsal red mesajı gönder
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

// Servis durumunu kontrol et
function checkServiceFound() {
  return serviceFound;
}

// ✅ YENİ: Birleştirilmiş mesajı işle - KURUMSAL SELAMLAMA ENTEGRE
async function processCombinedMessage(message, combinedMessage, contactInfo) {
  console.log(`🎯 SON İŞLEM: "${combinedMessage}"`);
  
  // ✅ KRİTİK: Önce saf selamlama kontrolü
  if (isPureGreeting(combinedMessage)) {
    console.log(`👋 SAF SELAMLAMA: Kurumsal karşılama gönderiliyor`);
    await sendCorporateGreeting(message, contactInfo.name);
    resetBufferState(message.from);
    return;
  }
  
  // Normal işlem akışı
  const parsedMessage = messageParser.parseMessage(combinedMessage);
  
  console.log(`📝 SON AYRIŞTIRMA: Orijinal="${combinedMessage}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
  
  const sessionManager = require('./sessionManager');
  sessionManager.stopHelpTimer(message.from);
  sessionManager.stopMenuTimer(message.from);
  sessionManager.stopMenuGoodbyeTimer(message.from);
  
  if (isImmediateCommand(combinedMessage)) {
    console.log(`⚡ KOMUT ALGILANDI: "${combinedMessage}"`);
  }
  
  await sessionRouter.route(message, parsedMessage, contactInfo.name, () => {
    serviceFound = true;
    console.log('✅ SERVİS BULUNDU');
  });
  
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

// Ana Mesaj İşleme Fonksiyonu
async function handleMessage(message) {
  try {
    serviceFound = false;
    
    const validationResult = validation.validateMessage(message);
    if (!validationResult.isValid) {
      if (validationResult.reason === 'has_media') {
        await errorHandler.handleMediaError(message);
      }
      return;
    }

    const contactInfo = await contactManager.logContactInteraction(message, 'Mesaj alındı');
    
    const sessionManager = require('./sessionManager');
    let session = sessionManager.getUserSession(message.from);
    
    console.log(`🔍 OTURUM: ${session.currentState}, Mesaj: "${validationResult.messageBody}"`);
    console.log(`📊 BUFFER: ${session.messageBuffer.length} mesaj, İşleniyor: ${session.isProcessingBuffer}`);
    
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    
    if (session.isProcessingBuffer) {
      console.log(`⏳ BUFFER İŞLENİYOR, BEKLE...`);
      return;
    }
    
    if (isActiveProcessState(session.currentState)) {
      console.log(`⚡ AKTİF İŞLEM: Buffer bypass`);
      
      updateBufferState(message.from, validationResult.messageBody, 0, true);
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    const isSpecialCommand = isImmediateCommand(validationResult.messageBody);
    if (isSpecialCommand) {
      console.log(`⚡ KOMUT: Buffer bypass - "${validationResult.messageBody}"`);
      
      updateBufferState(message.from, validationResult.messageBody, 0, true);
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    sessionManager.addToMessageBuffer(message.from, validationResult.messageBody);
    
    const bufferStatus = sessionManager.getBufferStatus(message.from);
    console.log(`📥 BUFFER'A EKLENDİ: ${bufferStatus.bufferSize} mesaj -> "${bufferStatus.bufferContent}"`);
    
    const isFirstMessage = bufferStatus.bufferSize === 1;
    const smartWaitTime = calculateSmartWaitTime(validationResult.messageBody, message.from, isFirstMessage);
    
    const shouldCombine = shouldCombineMessages(validationResult.messageBody, session.messageBuffer, message.from);
    
    if (!isSpecialCommand && bufferStatus.bufferSize === 1 && !shouldCombine) {
      console.log(`⏰ GERÇEK BEKLEME: ${smartWaitTime}ms bekleniyor...`);
      
      updateBufferState(message.from, validationResult.messageBody, smartWaitTime, false);
      return;
    }
    
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

// Hızlı komut işleme
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
  
  // GELİŞMİŞ FONKSİYONLAR
  sendServiceNotAvailable,
  isImmediateCommand,
  isActiveProcessState,
  shouldCombineMessages,
  processCombinedMessage,
  processImmediateCommand,
  // ✅ YENİ: Kurumsal selamlama fonksiyonu
  sendCorporateGreeting
};