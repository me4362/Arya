// modules/saleFlow/timeoutManager.js
const logger = require('../logger');
const sessionManager = require('../sessionManager');
const { getGlobalClient } = require('../utils/globalClient');

// Satış zaman aşımı başlat
function startSaleTimeout(userId, message) {
  const session = sessionManager.getUserSession(userId);
  
  // Önceki timer'ı temizle
  if (session && session.saleTimer) {
    clearTimeout(session.saleTimer);
  }
  
  console.log(`⏰ Satış zaman aşımı başlatıldı: ${userId}`);
  
  const saleTimer = setTimeout(async () => {
    await handleSaleTimeout(userId);
  }, 5 * 60 * 1000); // 5 dakika
  
  // Konuşmayı başlat
  const conversationManager = require('./conversationManager');
  conversationManager.startSaleConversation(userId);
  
  sessionManager.updateUserSession(userId, {
    saleTimer: saleTimer,
    currentState: 'waiting_for_sale_response'
  });
}

// Satış zaman aşımı işleme - CLIENT FIX İLE GÜNCELLENDİ
async function handleSaleTimeout(userId) {
  const session = sessionManager.getUserSession(userId);
  if (session && session.currentState === 'waiting_for_sale_response') {
    logger.info(`⏰ Satış zaman aşımı - Kullanıcı: ${userId}`);
    
    try {
      // Global client instance'ını kullan
      const client = getGlobalClient();
      
      if (client && client.info) {
        const chat = await client.getChatById(userId);
        await chat.sendMessage('⏰ *Cevap süresi doldu*\n\n' +
                              'Yeşil Sigorta ihtiyacınız olduğunda tekrar "yeşil sigorta" yazabilirsiniz. 🛡️\n\n' +
                              'İyi günler dilerim! ✨');
        logger.info(`Zaman aşımı mesajı gönderildi: ${userId}`);
      } else {
        logger.warn('Client instance hazır değil, zaman aşımı mesajı gönderilemedi');
      }
      
    } catch (error) {
      logger.error(`Zaman aşımı mesajı gönderme hatası: ${error.message}`);
    }
    
    // Konuşmayı bitir
    const conversationManager = require('./conversationManager');
    await conversationManager.endSaleConversation(userId);
    conversationManager.logSaleStatistics(userId, 'timeout', false);
  }
}

// Satış timer'ını temizle
function clearSaleTimer(userId) {
  const session = sessionManager.getUserSession(userId);
  if (session && session.saleTimer) {
    clearTimeout(session.saleTimer);
    sessionManager.updateUserSession(userId, { saleTimer: null });
    console.log(`⏰ Satış timer temizlendi: ${userId}`);
  }
}

// Tüm satış timer'larını temizle (shutdown için)
function clearAllSaleTimers() {
  const sessions = sessionManager.userSessions;
  let clearedCount = 0;
  
  sessions.forEach((session, userId) => {
    if (session.saleTimer) {
      clearTimeout(session.saleTimer);
      clearedCount++;
    }
  });
  
  console.log(`⏰ ${clearedCount} satış timer temizlendi`);
}

module.exports = {
  startSaleTimeout,
  handleSaleTimeout,
  clearSaleTimer,
  clearAllSaleTimers
};