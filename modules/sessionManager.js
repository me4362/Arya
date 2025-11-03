const logger = require('./logger');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

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

// ✅ YENİ: Kurumsal karşılama mesajı
async function sendCorporateGreeting(userId, userMessage) {
  try {
    const greeting = `🏢 *PlanB Global Network Ltd*'ye hoş geldiniz!\n\n` +
                    `📍 Mesajınız: "${userMessage}"\n\n` +
                    `🛎️ Size nasıl yardımcı olabilirim? Lütfen ihtiyacınız olan hizmeti belirtin:\n\n` +
                    `• Sigorta hizmetleri\n` +
                    `• Yazılım geliştirme\n` +
                    `• Lojistik hizmetleri\n` +
                    `• Diğer profesyonel hizmetler\n\n` +
                    `ℹ️ *"menü"* yazarak tüm hizmetlerimizi görebilirsiniz.`;
    
    await sendMessageWithoutQuote(userId, greeting);
    console.log(`🏢 Kurumsal karşılama gönderildi: ${userId}`);
  } catch (error) {
    console.error(`❌ Kurumsal karşılama hatası: ${error.message}`);
    // Fallback: normal mesaj gönderme
    try {
      const message = { from: userId };
      await message.reply(greeting);
    } catch (fallbackError) {
      console.error(`❌ Fallback mesaj gönderme hatası: ${fallbackError.message}`);
    }
  }
}

function addToMessageBuffer(userId, message) {
  const session = getUserSession(userId);
  const now = Date.now();
  
  console.log(`📥 Buffer'a mesaj eklendi: "${message}" - Kullanıcı: ${userId}`);
  
  session.messageBuffer.push(message);
  session.lastMessageTime = now;
  
  // Önceki timer'ı temizle
  if (session.messageTimer) {
    clearTimeout(session.messageTimer);
  }
  
  // ✅ GÜNCELLENDİ: 10 saniye timer başlat
  session.messageTimer = setTimeout(() => {
    processMessageBuffer(userId);
  }, 10000); // 10 saniye
  
  return session.messageBuffer;
}

// ✅ GÜNCELLENDİ: Buffer işleme fonksiyonu - kurumsal mesaj eklendi
function processMessageBuffer(userId) {
  const session = getUserSession(userId);
  
  if (session.isProcessingBuffer || session.messageBuffer.length === 0) {
    return null;
  }
  
  session.isProcessingBuffer = true;
  
  const combinedMessage = session.messageBuffer.join(' ');
  console.log(`🔄 Buffer işleniyor: "${combinedMessage}" - Kullanıcı: ${userId}`);
  
  // Buffer'ı temizle
  session.messageBuffer = [];
  session.messageTimer = null;
  session.isProcessingBuffer = false;
  
  // ✅ KURUMSAL MESAJI GÖNDER
  sendCorporateGreeting(userId, combinedMessage);
  
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

// ✅ YENİ: Buffer'ı hemen işleme fonksiyonu (manuel tetikleme için)
function forceProcessBuffer(userId) {
  const session = getUserSession(userId);
  if (session.messageTimer) {
    clearTimeout(session.messageTimer);
    session.messageTimer = null;
  }
  return processMessageBuffer(userId);
}

// GÜNCELLENMİŞ startHelpTimer FONKSİYONU
function startHelpTimer(userId, message, services) {
  const session = getUserSession(userId);
  
  // Önceki timer'ları temizle
  if (session.helpTimer) {
    clearTimeout(session.helpTimer);
  }
  if (session.goodbyeTimer) {
    clearTimeout(session.goodbyeTimer);
  }

  console.log(`⏰ Yardım timer başlatıldı - Kullanıcı: ${userId}`);

  // 1. Timer: 3 dakika sonra menüyü göster
  const helpTimer = setTimeout(async () => {
    const currentSession = getUserSession(userId);
    console.log(`⏰ Yardım zaman aşımı - Menü gösteriliyor: ${userId}`);
    
    const menuHandler = require('./menuHandler');
    await menuHandler.showMainMenu(message, services);
    
    // 2. Timer: 3 dakika sonra vedalaşma (toplam 6 dakika)
    const goodbyeTimer = setTimeout(async () => {
      console.log(`⏰ Vedalaşma zaman aşımı - Kullanıcı: ${userId}`);
      await handleGoodbye(message);
    }, 3 * 60 * 1000);
    
    updateUserSession(userId, { 
      goodbyeTimer: goodbyeTimer
    });
    
  }, 3 * 60 * 1000);

  updateUserSession(userId, { 
    waitingForHelp: true, 
    helpTimer: helpTimer
  });
}

// ✅ YENİ FONKSİYON: 6 dakika menü vedalaşma timer'ı
function startMenuGoodbyeTimer(userId, message) {
  const session = getUserSession(userId);
  
  // Önceki timer'ları temizle
  if (session.menuTimer) {
    clearTimeout(session.menuTimer);
  }

  console.log(`⏰ Menü vedalaşma timer başlatıldı (6 dakika) - Kullanıcı: ${userId}`);

  // 6 dakika sonra direkt vedalaşma
  const menuTimer = setTimeout(async () => {
    console.log(`⏰ 6 dakika zaman aşımı - Vedalaşma: ${userId}`);
    await handleGoodbye(message);
  }, 6 * 60 * 1000); // 6 dakika

  updateUserSession(userId, { 
    menuTimer: menuTimer
  });
}

// ✅ YENİ FONKSİYON: Menü timer'ını durdur
function stopMenuGoodbyeTimer(userId) {
  const session = getUserSession(userId);
  if (session && session.menuTimer) {
    clearTimeout(session.menuTimer);
    updateUserSession(userId, { 
      menuTimer: null
    });
    console.log(`⏰ Menü timer durduruldu - Kullanıcı: ${userId}`);
  }
}

// GÜNCELLENMİŞ handleGoodbye FONKSİYONU
async function handleGoodbye(message) {
  try {
    const serviceLoader = require('./serviceLoader');
    const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
    
    // Türkiye saat dilimine göre saat bilgisi
    const now = new Date();
    const turkiyeSaati = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}));
    const saat = turkiyeSaati.getHours();
    
    let goodbyeMsg = '';
    
    // JSON'daki vedalaşma mesajlarını kullan
    if (greetings?.vedalasma?.hoscakal) {
      // Rastgele bir vedalaşma mesajı seç
      const randomIndex = Math.floor(Math.random() * greetings.vedalasma.hoscakal.length);
      goodbyeMsg = greetings.vedalasma.hoscakal[randomIndex];
      
      // Saate göre emoji ve kişiselleştirme ekle
      let timeEmoji = '👋';
      let timeContext = '';
      
      if (saat >= 6 && saat < 12) {
        // SABAH
        timeEmoji = '☀️';
        timeContext = ' Güneşli ve verimli bir gün geçirmenizi dileriz!';
      } else if (saat >= 12 && saat < 18) {
        // ÖĞLEN
        timeEmoji = '🌞'; 
        timeContext = ' Verimli bir gün geçirmenizi dileriz!';
      } else if (saat >= 18 && saat < 23) {
        // AKŞAM
        timeEmoji = '🌙';
        timeContext = ' Huzurlu bir akşam geçirmenizi dileriz!';
      } else {
        // GECE
        timeEmoji = '🌙';
        timeContext = ' Huzurlu bir gece geçirmenizi dileriz!';
      }
      
      // Mesajı kişiselleştir
      goodbyeMsg = goodbyeMsg.replace('👋', timeEmoji);
      if (!goodbyeMsg.includes('PlanB Global Network Ltd Şti')) {
        goodbyeMsg += timeContext;
      }
    } else {
      // Fallback mesaj
      goodbyeMsg = '👋 PlanB Global Network Ltd Şti adına iyi günler dileriz!';
    }
    
    await sendMessageWithoutQuote(message.from, goodbyeMsg);
    
    console.log(`👋 Vedalaşma mesajı gönderildi (Saat: ${saat}:00) - Kullanıcı: ${message.from}`);
    
    // Oturumu temizle
    updateUserSession(message.from, {
      currentState: 'main_menu',
      waitingForHelp: false,
      helpTimer: null,
      goodbyeTimer: null,
      menuTimer: null
    });
    
  } catch (error) {
    console.log(`❌ Vedalaşma mesajı hatası: ${error.message}`);
    // Fallback mesaj
    await sendMessageWithoutQuote(message.from, '👋 PlanB Global Network Ltd Şti adına iyi günler dileriz!');
  }
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
  getBufferStatus,
  // ✅ YENİ FONKSİYONLAR
  startMenuGoodbyeTimer,
  stopMenuGoodbyeTimer,
  sendCorporateGreeting,
  forceProcessBuffer
};