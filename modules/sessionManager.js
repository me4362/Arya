const logger = require('./logger');

// Kullanıcı oturumlarını takip etmek için
const userSessions = new Map();

// Timer sabitleri - merkezi yönetim için
const TIMER_DELAYS = {
  MESSAGE_BUFFER: 7000,
  MENU_TIMEOUT: 5 * 60 * 1000, // 5 dakika (sadece bir defa menü gösterimi)
  HELP_TIMEOUT: 5 * 60 * 1000, // 5 dakika
  GOODBYE_TIMEOUT: 5 * 60 * 1000 // 5 dakika
};

// Kullanıcı oturumu oluştur - GÜNCELLENDİ
function createUserSession(userId) {
  const session = {
    userId: userId,
    lastActivity: Date.now(),
    waitingForResponse: false,
    waitingForHelp: false,
    menuTimer: null,
    saleTimer: null,
    helpTimer: null,
    goodbyeTimer: null,
    currentState: 'main_menu',
    currentService: null,
    messageBuffer: [],
    messageTimer: null,
    lastMessageTime: Date.now(),
    isProcessingBuffer: false,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: null,
    menuHistory: [],
    menuShown: false, // YENİ: Menü gösterildi mi?
    goodbyeSent: false // YENİ: Veda mesajı gönderildi mi?
  };
  
  userSessions.set(userId, session);
  logger.info(`🆕 Yeni oturum oluşturuldu: ${userId}`);
  return session;
}

// Timer temizleme yardımcı fonksiyonu
function clearTimer(timer) {
  if (timer) {
    clearTimeout(timer);
  }
  return null;
}

// Tüm timer'ları temizle
function clearAllTimers(session) {
  if (!session) return;
  
  session.menuTimer = clearTimer(session.menuTimer);
  session.saleTimer = clearTimer(session.saleTimer);
  session.helpTimer = clearTimer(session.helpTimer);
  session.goodbyeTimer = clearTimer(session.goodbyeTimer);
  session.messageTimer = clearTimer(session.messageTimer);
}

function addToMessageBuffer(userId, message) {
  const session = getUserSession(userId);
  const now = Date.now();
  
  logger.debug(`📥 Buffer'a mesaj eklendi: "${message}" - Kullanıcı: ${userId}`);
  
  session.messageBuffer.push(message);
  session.lastMessageTime = now;
  
  // Timer'ı temizleme iyileştirildi
  session.messageTimer = clearTimer(session.messageTimer);
  
  // 7 saniye bekleme süresi
  session.messageTimer = setTimeout(() => {
    logger.debug(`⏰ Buffer zaman aşımı - İşlenmeye hazır: ${userId}`);
  }, TIMER_DELAYS.MESSAGE_BUFFER);
  
  return session.messageBuffer;
}

function processMessageBuffer(userId) {
  const session = getUserSession(userId);
  
  if (session.messageBuffer.length === 0) {
    return null;
  }
  
  // Buffer'ı birleştir
  const combinedMessage = session.messageBuffer.join(' ');
  
  // Buffer'ı temizle ve timer'ı durdur
  session.messageBuffer = [];
  session.messageTimer = clearTimer(session.messageTimer);
  
  logger.debug(`🔄 Buffer işlendi: "${combinedMessage}" - Kullanıcı: ${userId}`);
  return combinedMessage;
}

function clearMessageBuffer(userId) {
  const session = getUserSession(userId);
  
  session.messageTimer = clearTimer(session.messageTimer);
  session.messageBuffer = [];
  session.isProcessingBuffer = false;
  
  logger.debug(`🧹 Buffer temizlendi - Kullanıcı: ${userId}`);
}

function getBufferStatus(userId) {
  const session = getUserSession(userId);
  return {
    hasBuffer: session.messageBuffer.length > 0,
    bufferSize: session.messageBuffer.length,
    isProcessing: session.isProcessingBuffer,
    lastMessageTime: session.lastMessageTime,
    bufferContent: session.messageBuffer.join(' ')
  };
}

function setIsProcessingBuffer(userId, isProcessing) {
  const session = getUserSession(userId);
  session.isProcessingBuffer = isProcessing;
  logger.debug(`🔄 isProcessingBuffer ayarlandı: ${isProcessing} - Kullanıcı: ${userId}`);
}

// Kullanıcı oturumunu güncelle - GÜNCELLENDİ
function updateUserSession(userId, updates) {
  const session = getUserSession(userId);
  Object.assign(session, updates);
  session.lastActivity = Date.now();
  userSessions.set(userId, session);
  
  logger.debug(`📝 Oturum güncellendi: ${userId}, Durum: ${session.currentState}`);
  return session;
}

// Oturumu getir - GÜNCELLENDİ
function getUserSession(userId) {
  let session = userSessions.get(userId);
  if (!session) {
    logger.info(`🆕 Oturum bulunamadı, yeni oluşturuluyor: ${userId}`);
    session = createUserSession(userId);
  }
  return session;
}

// Menü zamanlayıcı başlat - YENİDEN YAZILDI (5 DAKİKA + VEDA)
function startMenuTimer(userId, message, services) {
  const session = getUserSession(userId);
  
  // Eğer menü zaten gösterildiyse ve veda mesajı gönderildiyse, tekrar başlatma
  if (session.menuShown && session.goodbyeSent) {
    logger.info(`⏰ Menü zaten gösterildi ve veda mesajı gönderildi - Timer başlatılmıyor: ${userId}`);
    return;
  }
  
  // Önceki timer'ları temizle
  clearAllTimers(session);
  
  logger.info(`⏰ 5 dakika menü timer başlatıldı - Kullanıcı: ${userId}`);

  // 5 dakika sonra direkt veda mesajı göster
  const menuTimer = setTimeout(async () => {
    try {
      const currentSession = getUserSession(userId);
      
      // Eğer zaten veda gönderildiyse veya aktif işlem varsa, bir şey yapma
      if (currentSession.goodbyeSent || currentSession.currentState === 'in_service') {
        logger.info(`⏰ Timer tetiklendi ama aktif işlem var veya veda gönderildi - İşlem yapılmıyor: ${userId}`);
        return;
      }
      
      logger.info(`⏰ 5 dakika zaman aşımı - Veda mesajı gönderiliyor: ${userId}`);
      
      // Direkt veda mesajı gönder
      await handleGoodbye(message);
      
      // Oturumu kapat
      updateUserSession(userId, {
        waitingForResponse: false,
        menuTimer: null,
        goodbyeSent: true,
        currentState: 'ended'
      });
      
    } catch (error) {
      logger.error(`Menü timer hatası: ${error.message} - Kullanıcı: ${userId}`);
    }
  }, TIMER_DELAYS.MENU_TIMEOUT);

  updateUserSession(userId, { 
    waitingForResponse: true, 
    menuTimer: menuTimer,
    currentState: 'waiting_for_service',
    menuShown: true, // Menü gösterildi olarak işaretle
    goodbyeSent: false // Veda mesajı henüz gönderilmedi
  });
}

// Menü zamanlayıcıyı durdur - GÜNCELLENDİ
function stopMenuTimer(userId) {
  const session = getUserSession(userId);
  if (session) {
    session.menuTimer = clearTimer(session.menuTimer);
    updateUserSession(userId, { 
      waitingForResponse: false
    });
    logger.debug(`⏰ Menü timer durduruldu - Kullanıcı: ${userId}`);
  }
}

// Yardım timer'ı başlat - GÜNCELLENDİ
function startHelpTimer(userId, message, services) {
  const session = getUserSession(userId);
  
  // Eğer veda mesajı zaten gönderildiyse, yardım timer'ı başlatma
  if (session.goodbyeSent) {
    logger.info(`⏰ Veda mesajı zaten gönderildi - Yardım timer başlatılmıyor: ${userId}`);
    return;
  }
  
  // Önceki timer'ları temizle
  clearAllTimers(session);

  logger.info(`⏰ Yardım timer başlatıldı - Kullanıcı: ${userId}`);

  // 5 dakika sonra direkt veda mesajı göster
  const helpTimer = setTimeout(async () => {
    try {
      const currentSession = getUserSession(userId);
      if (currentSession && currentSession.waitingForHelp && !currentSession.goodbyeSent) {
        logger.info(`⏰ Yardım zaman aşımı - Veda mesajı gönderiliyor: ${userId}`);
        
        // Direkt veda mesajı gönder
        await handleGoodbye(message);
        
        updateUserSession(userId, { 
          waitingForHelp: false, 
          helpTimer: null,
          goodbyeSent: true
        });
      }
    } catch (error) {
      logger.error(`Yardım timer hatası: ${error.message} - Kullanıcı: ${userId}`);
    }
  }, TIMER_DELAYS.HELP_TIMEOUT);

  updateUserSession(userId, { 
    waitingForHelp: true, 
    helpTimer: helpTimer
  });
}

// Vedalaşma işlemi - GÜNCELLENDİ
async function handleGoodbye(message) {
  const userId = message.from;
  
  try {
    const serviceLoader = require('./serviceLoader');
    const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
    const goodbyeMsg = greetings?.vedalasma?.hoscakal?.[0] || 
                      'Hoşça kalın! PlanB Global Network Ltd Şti adına iyi günler dilerim.';
    
    await message.reply(goodbyeMsg);
    
    logger.info(`👋 Veda mesajı gönderildi - Kullanıcı: ${userId}`);
    
    // Oturumu kapat
    closeUserSession(userId);
    
  } catch (error) {
    logger.error(`Veda mesajı gönderilemedi: ${error.message} - Kullanıcı: ${userId}`);
    // Hata durumunda bile oturumu kapatmaya çalış
    closeUserSession(userId);
  }
}

// Oturumu kapatma fonksiyonu - YENİ
function closeUserSession(userId) {
  const session = getUserSession(userId);
  
  // Tüm timer'ları temizle
  clearAllTimers(session);
  
  // Oturumu kapatılmış olarak işaretle
  updateUserSession(userId, {
    waitingForResponse: false,
    waitingForHelp: false,
    menuTimer: null,
    saleTimer: null,
    helpTimer: null,
    goodbyeTimer: null,
    currentState: 'ended',
    currentService: null,
    messageBuffer: [],
    messageTimer: null,
    isProcessingBuffer: false,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: null,
    menuHistory: [],
    menuShown: true,
    goodbyeSent: true
  });
  
  logger.info(`🔒 Oturum kapatıldı - Kullanıcı: ${userId}`);
}

// Oturumu sıfırlama fonksiyonu - GÜNCELLENDİ
function resetUserSession(userId) {
  const session = getUserSession(userId);
  
  // Tüm timer'ları temizle
  clearAllTimers(session);
  
  // Oturumu başlangıç durumuna getir (menü gösterilmedi olarak)
  updateUserSession(userId, {
    waitingForResponse: false,
    waitingForHelp: false,
    menuTimer: null,
    saleTimer: null,
    helpTimer: null,
    goodbyeTimer: null,
    currentState: 'main_menu',
    currentService: null,
    messageBuffer: [],
    messageTimer: null,
    lastMessageTime: Date.now(),
    isProcessingBuffer: false,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: null,
    menuHistory: [],
    menuShown: false, // Menü gösterilmedi olarak sıfırla
    goodbyeSent: false // Veda mesajı gönderilmedi olarak sıfırla
  });
  
  logger.info(`🔄 Oturum sıfırlandı - Kullanıcı: ${userId}`);
}

// Yardım timer'ını durdur (kullanıcı cevap verdiğinde) - GÜNCELLENDİ
function stopHelpTimer(userId) {
  const session = getUserSession(userId);
  if (session) {
    session.helpTimer = clearTimer(session.helpTimer);
    session.goodbyeTimer = clearTimer(session.goodbyeTimer);
    
    logger.debug(`⏰ Yardım timer durduruldu - Kullanıcı: ${userId}`);
    
    updateUserSession(userId, { 
      waitingForHelp: false
    });
  }
}

// Satış zamanlayıcısını temizle - GÜNCELLENDİ
function clearSaleTimer(userId) {
  const session = getUserSession(userId);
  if (session) {
    session.saleTimer = clearTimer(session.saleTimer);
    logger.debug(`⏰ Satış timer temizlendi - Kullanıcı: ${userId}`);
  }
}

// Kullanıcı oturumunu tamamen sil
function deleteUserSession(userId) {
  const session = userSessions.get(userId);
  if (session) {
    clearAllTimers(session);
    userSessions.delete(userId);
    logger.info(`🗑️ Oturum silindi - Kullanıcı: ${userId}`);
    return true;
  }
  return false;
}

// Tüm oturumları temizle (debug için)
function clearAllSessions() {
  // Tüm timer'ları temizle
  userSessions.forEach((session) => {
    clearAllTimers(session);
  });
  
  const count = userSessions.size;
  userSessions.clear();
  logger.info(`🧹 ${count} oturum temizlendi`);
}

// Aktif oturumları listele (debug için)
function listActiveSessions() {
  logger.info(`📊 Aktif oturumlar: ${userSessions.size}`);
  userSessions.forEach((session, userId) => {
    const menuStatus = session.menuShown ? ' (Menü gösterildi)' : ' (Menü gösterilmedi)';
    const goodbyeStatus = session.goodbyeSent ? ' - VEDA GÖNDERİLDİ' : '';
    logger.info(`  👤 ${userId}: ${session.currentState}${menuStatus}${goodbyeStatus}`);
  });
}

// Zaman aşımına uğramış oturumları temizle
function cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // Varsayılan: 24 saat
  const now = Date.now();
  let cleanedCount = 0;
  
  userSessions.forEach((session, userId) => {
    if (now - session.lastActivity > maxAge) {
      deleteUserSession(userId);
      cleanedCount++;
    }
  });
  
  if (cleanedCount > 0) {
    logger.info(`🧹 ${cleanedCount} zaman aşımına uğramış oturum temizlendi`);
  }
  
  return cleanedCount;
}

module.exports = {
  createUserSession,
  updateUserSession,
  getUserSession,
  resetUserSession,
  deleteUserSession,
  startMenuTimer,
  stopMenuTimer,
  clearSaleTimer,
  startHelpTimer,
  stopHelpTimer,
  handleGoodbye,
  closeUserSession, // YENİ
  userSessions,
  clearAllSessions,
  listActiveSessions,
  cleanupExpiredSessions,
  // YENİ BUFFER FONKSİYONLARI
  addToMessageBuffer,
  processMessageBuffer,
  clearMessageBuffer,
  getBufferStatus,
  setIsProcessingBuffer,
  // Timer sabitleri
  TIMER_DELAYS
};
