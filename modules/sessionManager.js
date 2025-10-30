const logger = require('./logger');

const userSessions = new Map();

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
    menuHistory: [],
    messageBuffer: [],
    messageTimer: null,
    lastMessageTime: Date.now(),
    isProcessingBuffer: false
  };
  
  userSessions.set(userId, session);
  console.log(`🆕 Yeni oturum oluşturuldu: ${userId}`);
  return session;
}

function updateUserSession(userId, updates) {
  const session = getUserSession(userId);
  Object.assign(session, updates);
  session.lastActivity = Date.now();
  userSessions.set(userId, session);
  
  console.log(`📝 Oturum güncellendi: ${userId}, Durum: ${session.currentState}`);
  return session;
}

function getUserSession(userId) {
  let session = userSessions.get(userId);
  if (!session) {
    console.log(`🆕 Oturum bulunamadı, yeni oluşturuluyor: ${userId}`);
    session = createUserSession(userId);
  }
  return session;
}

function addToMessageBuffer(userId, message) {
  const session = getUserSession(userId);
  const now = Date.now();
  
  console.log(`📥 Buffer'a mesaj eklendi: "${message}" - Kullanıcı: ${userId}`);
  
  session.messageBuffer.push(message);
  session.lastMessageTime = now;
  
  if (session.messageTimer) {
    clearTimeout(session.messageTimer);
  }
  
  session.messageTimer = setTimeout(() => {
    processMessageBuffer(userId);
  }, 35000);
  
  return session.messageBuffer;
}

function processMessageBuffer(userId) {
  const session = getUserSession(userId);
  
  if (session.isProcessingBuffer || session.messageBuffer.length === 0) {
    return null;
  }
  
  session.isProcessingBuffer = true;
  
  const combinedMessage = session.messageBuffer.join(' ');
  console.log(`🔄 Buffer işleniyor: "${combinedMessage}" - Kullanıcı: ${userId}`);
  
  session.messageBuffer = [];
  session.messageTimer = null;
  session.isProcessingBuffer = false;
  
  return combinedMessage;
}

function clearMessageBuffer(userId) {
  const session = getUserSession(userId);
  
  if (session.messageTimer) {
    clearTimeout(session.messageTimer);
    session.messageTimer = null;
  }
  
  session.messageBuffer = [];
  session.isProcessingBuffer = false;
  
  console.log(`🧹 Buffer temizlendi - Kullanıcı: ${userId}`);
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

function startHelpTimer(userId, message, services) {
  const session = getUserSession(userId);
  if (session && session.helpTimer) {
    clearTimeout(session.helpTimer);
  }
  if (session && session.goodbyeTimer) {
    clearTimeout(session.goodbyeTimer);
  }

  console.log(`⏰ Yardım timer başlatıldı - Kullanıcı: ${userId}`);

  const helpTimer = setTimeout(async () => {
    const currentSession = getUserSession(userId);
    if (currentSession && currentSession.waitingForHelp) {
      console.log(`⏰ Yardım zaman aşımı - Menü gösteriliyor: ${userId}`);
      
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, services);
      
      const goodbyeTimer = setTimeout(async () => {
        await handleGoodbye(message);
      }, 3 * 60 * 1000);
      
      updateUserSession(userId, { 
        waitingForHelp: false, 
        helpTimer: null,
        goodbyeTimer: goodbyeTimer
      });
    }
  }, 3 * 60 * 1000);

  updateUserSession(userId, { 
    waitingForHelp: true, 
    helpTimer: helpTimer
  });
}

async function handleGoodbye(message) {
  const serviceLoader = require('./serviceLoader');
  const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
  const goodbyeMsg = greetings?.vedalasma?.hoscakal?.[0] || 
                    'Hoşça kalın! PlanB Global Network Ltd Şti adına iyi günler dilerim.';
  
  await message.reply(goodbyeMsg);
  
  console.log(`👋 Vedalaşma mesajı gönderildi - Kullanıcı: ${message.from}`);
  
  updateUserSession(message.from, {
    currentState: 'main_menu',
    waitingForHelp: false,
    helpTimer: null,
    goodbyeTimer: null
  });
}

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

function clearSaleTimer(userId) {
  const session = getUserSession(userId);
  if (session && session.saleTimer) {
    clearTimeout(session.saleTimer);
    updateUserSession(userId, { saleTimer: null });
    console.log(`⏰ Satış timer temizlendi - Kullanıcı: ${userId}`);
  }
}

function clearAllSessions() {
  const count = userSessions.size;
  userSessions.clear();
  console.log(`🧹 ${count} oturum temizlendi`);
}

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
  listActiveSessions,
  addToMessageBuffer,
  processMessageBuffer,
  clearMessageBuffer,
  getBufferStatus
};
