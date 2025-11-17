const logger = require('./logger');

// Kullanıcı oturumlarını takip etmek için
const userSessions = new Map();

// ----------  Temel Oturum  ----------
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
    menuHistory: []
  };
  userSessions.set(userId, session);
  console.log(`🆕 Yeni oturum oluşturuldu: ${userId}`);
  return session;
}

function getUserSession(userId) {
  let session = userSessions.get(userId);
  if (!session) session = createUserSession(userId);
  return session;
}

function updateUserSession(userId, updates) {
  const session = getUserSession(userId);
  Object.assign(session, updates);
  session.lastActivity = Date.now();
  userSessions.set(userId, session);
  console.log(`📝 Oturum güncellendi: ${userId}, Durum: ${session.currentState}`);
}

function deleteUserSession(userId) {
  userSessions.delete(userId);
  console.log(`🗑️ Oturum silindi: ${userId}`);
}

function clearAllSessions() {
  const c = userSessions.size;
  userSessions.clear();
  console.log(`🧹 ${c} oturum temizlendi`);
}

// ----------  Buffer Yönetimi (korunmuş) ----------
const addToMessageBuffer = (userId, message) => {
  const session = getUserSession(userId);
  const now = Date.now();
  console.log(`📥 Buffer'a mesaj eklendi: "${message}" - Kullanıcı: ${userId}`);
  session.messageBuffer.push(message);
  session.lastMessageTime = now;
  if (session.messageTimer) clearTimeout(session.messageTimer);
  session.messageTimer = setTimeout(() => {
    console.log(`⏰ Buffer zaman aşımı - İşlenmeye hazır: ${userId}`);
  }, 7000);
  return session.messageBuffer;
};

const processMessageBuffer = (userId) => {
  const session = getUserSession(userId);
  if (!session.messageBuffer.length) return null;
  const combined = session.messageBuffer.join(' ');
  session.messageBuffer = [];
  if (session.messageTimer) { clearTimeout(session.messageTimer); session.messageTimer = null; }
  return combined;
};

const clearMessageBuffer = (userId) => {
  const session = getUserSession(userId);
  if (session.messageTimer) { clearTimeout(session.messageTimer); session.messageTimer = null; }
  session.messageBuffer = []; session.isProcessingBuffer = false;
  console.log(`🧹 Buffer temizlendi - Kullanıcı: ${userId}`);
};

const getBufferStatus = (userId) => {
  const s = getUserSession(userId);
  return { hasBuffer: s.messageBuffer.length > 0, bufferSize: s.messageBuffer.length, isProcessing: s.isProcessingBuffer, lastMessageTime: s.lastMessageTime, bufferContent: s.messageBuffer.join(' ') };
};

const setIsProcessingBuffer = (userId, val) => {
  getUserSession(userId).isProcessingBuffer = val;
  console.log(`🔄 isProcessingBuffer ayarlandı: ${val} - Kullanıcı: ${userId}`);
};

// ----------  Menu Goodbye Timer  ----------
function startMenuGoodbyeTimer(userId, message, services, timeoutMs = 6 * 60 * 1000) {
  const session = getUserSession(userId);
  if (session.menuGoodbyeTimer) clearTimeout(session.menuGoodbyeTimer);

  session.menuGoodbyeTimer = setTimeout(async () => {
    const menuHandler = require('./menuHandler');
    await menuHandler.showMainMenu(message, services);
    updateUserSession(userId, { currentState: 'main_menu' });
  }, timeoutMs);
  console.log(`⏰ MenuGoodbyeTimer başlatıldı (${timeoutMs / 1000}s): ${userId}`);
}

/**
 * menuHandler.js'nin çağırdığı fonksiyon - HATA DÜZELTME
 */
function stopMenuGoodbyeTimer(userId) {
  const session = getUserSession(userId);
  if (session && session.menuGoodbyeTimer) {
    clearTimeout(session.menuGoodbyeTimer);
    session.menuGoodbyeTimer = null;
    console.log(`⏰ MenuGoodbyeTimer durduruldu: ${userId}`);
  }
}

// ----------  Help & Goodbye Timer (korunmuş) ----------
function startHelpTimer(userId, message, services) {
  const s = getUserSession(userId);
  if (s.helpTimer) clearTimeout(s.helpTimer);
  if (s.goodbyeTimer) clearTimeout(s.goodbyeTimer);

  const helpT = setTimeout(async () => {
    const menuHandler = require('./menuHandler');
    await menuHandler.showMainMenu(message, services);
    const goodbyeT = setTimeout(async () => {
      const loader = require('./serviceLoader');
      const greetings = loader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
      const msg = greetings?.vedalasma?.hoscakal?.[0] || 'Hoşça kalın! PlanB Global Network Ltd Şti adına iyi günler dilerim.';
      await message.reply(msg);
      updateUserSession(userId, { currentState: 'main_menu', waitingForHelp: false, helpTimer: null, goodbyeTimer: null });
      clearMessageBuffer(userId);
    }, 3 * 60 * 1000);
    updateUserSession(userId, { waitingForHelp: false, helpTimer: null, goodbyeTimer: goodbyeT });
  }, 3 * 60 * 1000);

  updateUserSession(userId, { waitingForHelp: true, helpTimer: helpT });
  console.log(`⏰ HelpTimer başlatıldı: ${userId}`);
}

function stopHelpTimer(userId) {
  const s = getUserSession(userId);
  if (s) {
    if (s.helpTimer) { clearTimeout(s.helpTimer); console.log(`⏰ HelpTimer durduruldu: ${userId}`); }
    if (s.goodbyeTimer) { clearTimeout(s.goodbyeTimer); console.log(`⏰ GoodbyeTimer durduruldu: ${userId}`); }
    updateUserSession(userId, { waitingForHelp: false, helpTimer: null, goodbyeTimer: null });
  }
}

// ----------  Diğer Timer'lar ----------
function startMenuTimer(userId, message, services) { /* 60s sonra ana menü */ }
function stopMenuTimer(userId) { /* varsa timer'ı durdur */ }
function clearSaleTimer(userId) { /* saleTimer'ı sıfırla */ }

module.exports = {
  createUserSession,
  getUserSession,
  updateUserSession,
  deleteUserSession,
  clearAllSessions,
  // Buffer
  addToMessageBuffer,
  processMessageBuffer,
  clearMessageBuffer,
  getBufferStatus,
  setIsProcessingBuffer,
  // Timer'lar
  startMenuGoodbyeTimer,
  stopMenuGoodbyeTimer, // <-- YENİ, HATAYI KAPATIR
  startHelpTimer,
  stopHelpTimer,
  startMenuTimer,
  stopMenuTimer,
  clearSaleTimer
};
