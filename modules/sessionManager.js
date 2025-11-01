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

// ✅ OPTİMİZE EDİLMİŞ BUFFER FONKSİYONU
function addToMessageBuffer(userId, message) {
  const session = getUserSession(userId);
  const now = Date.now();
  
  console.log(`📥 Buffer'a mesaj eklendi: "${message}" - Kullanıcı: ${userId}`);
  
  session.messageBuffer.push(message);
  session.lastMessageTime = now;
  
  if (session.messageTimer) {
    clearTimeout(session.messageTimer);
  }

  // ✅ OPTİMİZE EDİLMİŞ BUFFER SÜRESİ HESAPLAMA
  const waitTime = calculateOptimalWaitTime(message, session);
  
  session.messageTimer = setTimeout(() => {
    processMessageBuffer(userId);
  }, waitTime);
  
  console.log(`⏰ Optimize buffer süresi: ${waitTime}ms - Mesaj: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`);
  
  return session.messageBuffer;
}

// ✅ YENİ FONKSİYON: Akıllı Buffer Süresi Hesaplama
function calculateOptimalWaitTime(message, session) {
  const messageLength = message.length;
  const hasQuestion = message.includes('?') || message.includes('mı?') || message.includes('mi?');
  const hasUrgentWords = hasUrgentKeywords(message);
  const isQuickResponse = hasQuickResponsePattern(message);
  const bufferSize = session.messageBuffer.length;
  
  let baseTime = 10000; // Varsayılan 10 saniye
  
  // 📝 MESAJ UZUNLUĞUNA GÖRE OPTİMİZASYON
  if (messageLength < 15) {
    baseTime = 5000; // Çok kısa mesajlar: 5 saniye
  } else if (messageLength < 30) {
    baseTime = 7000; // Kısa mesajlar: 7 saniye
  } else if (messageLength > 100) {
    baseTime = 4000; // Çok uzun mesajlar: 4 saniye (hızlı işle)
  } else if (messageLength > 50) {
    baseTime = 6000; // Uzun mesajlar: 6 saniye
  }
  
  // ❓ SORU VARSA DAHA HIZLI
  if (hasQuestion) {
    baseTime = Math.min(baseTime, 6000);
    
    // Acil sorular için ekstra hız
    if (hasUrgentWords) {
      baseTime = Math.min(baseTime, 4000);
    }
  }
  
  // 🚀 HIZLI YANIT GEREKTİREN MESAJLAR
  if (isQuickResponse) {
    baseTime = Math.min(baseTime, 5000);
  }
  
  // 📊 BUFFER DOLULUĞUNA GÖRE AYARLAMA
  if (bufferSize > 0) {
    // Buffer'da mesaj varsa biraz daha hızlı işle
    baseTime = Math.max(3000, baseTime - (bufferSize * 500));
  }
  
  // ⚡ MESAJ TİPİNE GÖRE İNCE AYAR
  if (hasEmojisOnly(message) || isConfirmationMessage(message)) {
    baseTime = 4000; // Emoji/onay mesajları: 4 saniye
  }
  
  // 🛡️ MİNİMUM VE MAKSİMUM SÜRE KONTROLÜ
  return Math.max(2000, Math.min(baseTime, 15000)); // 2-15 saniye arası
}

// ✅ YARDIMCI FONKSİYONLAR
function hasUrgentKeywords(message) {
  const urgentWords = [
    'acil', 'acele', 'hemen', 'lütfen', 'yardım', 'problem', 'sorun', 
    'hata', 'çalışmıyor', 'yetki', 'kritik', 'important', 'urgent',
    'bekliyorum', 'cevap', 'yanıt', 'ne zaman', 'kaç para', 'fiyat'
  ];
  
  const lowerMessage = message.toLowerCase();
  return urgentWords.some(word => lowerMessage.includes(word));
}

function hasQuickResponsePattern(message) {
  const quickPatterns = [
    'selam', 'merhaba', 'hello', 'hi', 'günaydın', 'iyi günler',
    'evet', 'hayır', 'tamam', 'ok', 'okey', '👍', '👋',
    'sağol', 'teşekkür', 'thanks', 'thank you'
  ];
  
  const lowerMessage = message.toLowerCase();
  return quickPatterns.some(pattern => lowerMessage.includes(pattern));
}

function hasEmojisOnly(message) {
  // Sadece emoji içeren mesajları tespit et
  const emojiRegex = /^(?:[\p{Emoji}\u200d\uFE0F\s]|[+-])+$/u;
  return emojiRegex.test(message.trim()) && message.length <= 10;
}

function isConfirmationMessage(message) {
  const confirmations = [
    'evet', 'hayır', 'tamam', 'old', 'olur', 'yok', 'var',
    'doğru', 'yanlış', 'kesin', 'belki', 'tabi', 'elbette'
  ];
  
  const lowerMessage = message.toLowerCase().trim();
  return confirmations.includes(lowerMessage) || lowerMessage.length <= 3;
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

// GÜNCELLENMİŞ handleGoodbye FONKSİYONU - ALINTISIZ MESAJ
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
    
    // ✅ DEĞİŞTİ: Alıntısız mesaj gönderme
    const { sendMessageWithoutQuote } = require('./utils/globalClient');
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
    // Fallback mesaj - yine alıntısız
    try {
      const { sendMessageWithoutQuote } = require('./utils/globalClient');
      await sendMessageWithoutQuote(message.from, '👋 PlanB Global Network Ltd Şti adına iyi günler dileriz!');
    } catch (fallbackError) {
      // Son çare: normal reply
      await message.reply('👋 PlanB Global Network Ltd Şti adına iyi günler dileriz!');
    }
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
  // ✅ OPTİMİZASYON FONKSİYONLARI (iç kullanım için)
  calculateOptimalWaitTime,
  hasUrgentKeywords,
  hasQuickResponsePattern
};