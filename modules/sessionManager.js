const logger = require('./logger');

// Kullanıcı oturumlarını takip etmek için
const userSessions = new Map();

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
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: null,
    menuHistory: []
  };
  
  userSessions.set(userId, session);
  console.log(`🆕 Yeni oturum oluşturuldu: ${userId}`);
  return session;
}

// Kullanıcı oturumunu güncelle - GÜNCELLENDİ
function updateUserSession(userId, updates) {
  const session = getUserSession(userId);
  Object.assign(session, updates);
  session.lastActivity = Date.now();
  userSessions.set(userId, session);
  
  console.log(`📝 Oturum güncellendi: ${userId}, Durum: ${session.currentState}`);
  return session;
}

// Oturumu getir - GÜNCELLENDİ
function getUserSession(userId) {
  let session = userSessions.get(userId);
  if (!session) {
    console.log(`🆕 Oturum bulunamadı, yeni oluşturuluyor: ${userId}`);
    session = createUserSession(userId);
  }
  return session;
}

// Yardım timer'ı başlat - GÜNCELLENDİ
function startHelpTimer(userId, message, services) {
  const session = getUserSession(userId);
  if (session && session.helpTimer) {
    clearTimeout(session.helpTimer);
  }
  if (session && session.goodbyeTimer) {
    clearTimeout(session.goodbyeTimer);
  }

  console.log(`⏰ Yardım timer başlatıldı - Kullanıcı: ${userId}`);

  // 1. Timer: 3 dakika sonra menüyü göster
  const helpTimer = setTimeout(async () => {
    const currentSession = getUserSession(userId);
    if (currentSession && currentSession.waitingForHelp) {
      console.log(`⏰ Yardım zaman aşımı - Menü gösteriliyor: ${userId}`);
      
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, services);
      
      // 2. Timer: 3 dakika sonra vedalaşma
      const goodbyeTimer = setTimeout(async () => {
        await handleGoodbye(message);
      }, 3 * 60 * 1000); // 3 dakika
      
      updateUserSession(userId, { 
        waitingForHelp: false, 
        helpTimer: null,
        goodbyeTimer: goodbyeTimer
      });
    }
  }, 3 * 60 * 1000); // 3 dakika

  updateUserSession(userId, { 
    waitingForHelp: true, 
    helpTimer: helpTimer
  });
}

// Vedalaşma işlemi - GÜNCELLENDİ
async function handleGoodbye(message) {
  const serviceLoader = require('./serviceLoader');
  const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
  const goodbyeMsg = greetings?.vedalasma?.hoscakal?.[0] || 
                    'Hoşça kalın! PlanB Global Network Ltd Şti adına iyi günler dilerim.';
  
  await message.reply(goodbyeMsg);
  
  console.log(`👋 Vedalaşma mesajı gönderildi - Kullanıcı: ${message.from}`);
  
  // Oturumu temizle
  updateUserSession(message.from, {
    currentState: 'main_menu',
    waitingForHelp: false,
    helpTimer: null,
    goodbyeTimer: null
  });
}

// Yardım timer'ını durdur (kullanıcı cevap verdiğinde) - GÜNCELLENDİ
function stopHelpTimer(userId) {
  const session = getUserSession(userId);
  if (session) {
    if (session.helpTimer) {
      clearTimeout(session.helpTimer);
      console.log(`⏰ Yardım timer durduruldu - Kullanıcı: ${userId}`);
    }
    if (session.goodbyeTimer) {
      clearTimeout(session.goodbyeTimer);
      console.log(`⏰ Vedalaşma timer durduruldu - Kullanıcı: ${userId}`);
    }
    updateUserSession(userId, { 
      waitingForHelp: false, 
      helpTimer: null,
      goodbyeTimer: null
    });
  }
}

// Menü zamanlayıcı başlat - GÜNCELLENDİ
function startMenuTimer(userId, message, services) {
  const session = getUserSession(userId);
  if (session && session.menuTimer) {
    clearTimeout(session.menuTimer);
  }

  const timer = setTimeout(async () => {
    const currentSession = getUserSession(userId);
    if (currentSession && currentSession.waitingForResponse) {
      console.log(`⏰ Menü zaman aşımı - Kullanıcı: ${userId}`);
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, services);
      updateUserSession(userId, { 
        waitingForResponse: false, 
        menuTimer: null,
        currentState: 'main_menu'
      });
    }
  }, 60000);

  updateUserSession(userId, { 
    waitingForResponse: true, 
    menuTimer: timer,
    currentState: 'waiting_for_service'
  });
}

// Menü zamanlayıcıyı durdur - GÜNCELLENDİ
function stopMenuTimer(userId) {
  const session = getUserSession(userId);
  if (session && session.menuTimer) {
    clearTimeout(session.menuTimer);
    updateUserSession(userId, { 
      waitingForResponse: false, 
      menuTimer: null
    });
    console.log(`⏰ Menü timer durduruldu - Kullanıcı: ${userId}`);
  }
}

// Satış zamanlayıcısını temizle - GÜNCELLENDİ
function clearSaleTimer(userId) {
  const session = getUserSession(userId);
  if (session && session.saleTimer) {
    clearTimeout(session.saleTimer);
    updateUserSession(userId, { saleTimer: null });
    console.log(`⏰ Satış timer temizlendi - Kullanıcı: ${userId}`);
  }
}

// Tüm oturumları temizle (debug için)
function clearAllSessions() {
  const count = userSessions.size;
  userSessions.clear();
  console.log(`🧹 ${count} oturum temizlendi`);
}

// Aktif oturumları listele (debug için)
function listActiveSessions() {
  console.log(`📊 Aktif oturumlar: ${userSessions.size}`);
  userSessions.forEach((session, userId) => {
    console.log(`  👤 ${userId}: ${session.currentState}`);
  });
}

module.exports = {
  createUserSession,
  updateUserSession,
  getUserSession,
  startMenuTimer,
  stopMenuTimer,
  clearSaleTimer,
  startHelpTimer,
  stopHelpTimer,
  handleGoodbye,
  userSessions,
  clearAllSessions,
  listActiveSessions
};