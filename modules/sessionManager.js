// modules/sessionManager.js - DÜZELTİLMİŞ TIMER SİSTEMİ
const logger = require('./logger');

const userSessions = new Map();

// Kullanıcı oturumu oluştur
function createUserSession(userId) {
  const session = {
    userId: userId,
    lastActivity: Date.now(),
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: null,
    menuHistory: [],
    // YENİ TIMER'LAR
    greetingTimer: null,      // 60 sn sonra yardım sorusu
    selectionTimer: null,     // 60 sn sonra seçim uyarısı  
    goodbyeTimer: null        // 180 sn sonra vedalaşma
  };
  
  userSessions.set(userId, session);
  console.log(`🆕 Yeni oturum: ${userId}`);
  return session;
}

// Kullanıcı oturumunu güncelle
function updateUserSession(userId, updates) {
  const session = getUserSession(userId);
  Object.assign(session, updates);
  session.lastActivity = Date.now();
  userSessions.set(userId, session);
  return session;
}

// Oturumu getir
function getUserSession(userId) {
  let session = userSessions.get(userId);
  if (!session) session = createUserSession(userId);
  return session;
}

// SELAMLAMA TIMER'I - 60 sn sonra yardım sorusu + 180 sn sonra vedalaşma
function startGreetingTimer(userId, message, services) {
  const session = getUserSession(userId);
  clearAllTimers(userId);

  console.log(`⏰ Selamlama timer başlatıldı: ${userId}`);

  const greetingTimer = setTimeout(async () => {
    const currentSession = getUserSession(userId);
    if (currentSession && currentSession.currentState === 'waiting_greeting_response') {
      console.log(`⏰ Selamlama zaman aşımı: ${userId}`);
      
      await sendHelpMessage(message, 'greeting');
      
      // 180 sn sonra vedalaşma - DOĞRUDAN BURADA
      const goodbyeTimer = setTimeout(async () => {
        const finalSession = getUserSession(userId);
        if (finalSession && !finalSession.currentService) {
          console.log(`⏰ Vedalaşma zaman aşımı: ${userId}`);
          await handleGoodbye(message);
        }
      }, 180 * 1000); // 180 saniye

      updateUserSession(userId, { 
        goodbyeTimer: goodbyeTimer
      });
    }
  }, 60 * 1000); // 60 saniye

  updateUserSession(userId, { 
    currentState: 'waiting_greeting_response',
    greetingTimer: greetingTimer
  });
}

// MENÜ SEÇİM TIMER'I - 60 sn sonra seçim uyarısı + 180 sn sonra vedalaşma
function startSelectionTimer(userId, message, services) {
  const session = getUserSession(userId);
  clearAllTimers(userId);

  console.log(`⏰ Seçim timer başlatıldı: ${userId}`);

  const selectionTimer = setTimeout(async () => {
    const currentSession = getUserSession(userId);
    if (currentSession && currentSession.currentState.includes('menu')) {
      console.log(`⏰ Seçim zaman aşımı: ${userId}`);
      
      await sendHelpMessage(message, 'selection');
      
      // 180 sn sonra vedalaşma - DOĞRUDAN BURADA
      const goodbyeTimer = setTimeout(async () => {
        const finalSession = getUserSession(userId);
        if (finalSession && !finalSession.currentService) {
          console.log(`⏰ Vedalaşma zaman aşımı: ${userId}`);
          await handleGoodbye(message);
        }
      }, 180 * 1000); // 180 saniye

      updateUserSession(userId, { 
        goodbyeTimer: goodbyeTimer
      });
    }
  }, 60 * 1000); // 60 saniye

  updateUserSession(userId, { 
    selectionTimer: selectionTimer
  });
}

// YARDIM MESAJI GÖNDER
async function sendHelpMessage(message, helpType) {
  try {
    const { sendMessageWithoutQuote } = require('./utils/globalClient');
    
    let helpMessage = '';
    if (helpType === 'greeting') {
      helpMessage = 'Size nasıl yardımcı olabilirim? Hizmetlerimizden hangisiyle ilgileniyorsunuz? *Menü* yazarak hizmetlerimiz listesine ulaşabilirsiniz.';
    } else {
      helpMessage = 'Seçim yapmakta yardıma ihtiyacınız var mı? Size hangi hizmeti sunabilirim? *Menü* yazarak tüm seçenekleri tekrar görebilirsiniz.';
    }
    
    await sendMessageWithoutQuote(message.from, helpMessage);
  } catch (error) {
    console.error('Yardım mesajı gönderme hatası:', error.message);
  }
}

// VEDALAŞMA İŞLEMİ - SAAT DİLİMİNE UYGUN
async function handleGoodbye(message) {
  try {
    const { sendMessageWithoutQuote } = require('./utils/globalClient');
    const greetingManager = require('./greetingManager');
    
    await greetingManager.handleGoodbye(message);
    
    // Oturumu temizle
    updateUserSession(message.from, {
      currentState: 'main_menu',
      currentService: null,
      currentQuestions: [],
      currentQuestionIndex: 0,
      collectedAnswers: {}
    });
    
    clearAllTimers(message.from);
    
  } catch (error) {
    console.error('Vedalaşma hatası:', error.message);
  }
}

// TÜM TIMER'LARI TEMİZLE
function clearAllTimers(userId) {
  const session = getUserSession(userId);
  if (session) {
    if (session.greetingTimer) clearTimeout(session.greetingTimer);
    if (session.selectionTimer) clearTimeout(session.selectionTimer);
    if (session.goodbyeTimer) clearTimeout(session.goodbyeTimer);
    
    updateUserSession(userId, {
      greetingTimer: null,
      selectionTimer: null,
      goodbyeTimer: null
    });
  }
}

// KULLANICI CEVAP VERDİĞİNDE TIMER'LARI DURDUR
function stopAllTimers(userId) {
  clearAllTimers(userId);
  console.log(`⏰ Tüm timer'lar durduruldu: ${userId}`);
}

// SATIŞ TIMER'I (mevcut sistemle uyumlu)
function clearSaleTimer(userId) {
  const session = getUserSession(userId);
  if (session && session.saleTimer) {
    clearTimeout(session.saleTimer);
    updateUserSession(userId, { saleTimer: null });
  }
}

// TÜM OTURUMLARI TEMİZLE
function clearAllSessions() {
  const count = userSessions.size;
  userSessions.clear();
  console.log(`🧹 ${count} oturum temizlendi`);
}

module.exports = {
  createUserSession,
  updateUserSession,
  getUserSession,
  startGreetingTimer,
  startSelectionTimer,
  stopAllTimers,
  clearSaleTimer,
  clearAllTimers,
  handleGoodbye,
  userSessions,
  clearAllSessions
};