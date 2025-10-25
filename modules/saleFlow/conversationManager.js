// modules/saleFlow/conversationManager.js
const logger = require('../logger');
const sessionManager = require('../sessionManager');

// Satış konuşmasını başlat
function startSaleConversation(userId) {
  console.log(`💰 Satış konuşması başlatılıyor: ${userId}`);
  
  sessionManager.updateUserSession(userId, {
    currentState: 'waiting_for_sale_response',
    inSaleConversation: true,
    saleStartTime: Date.now()
  });
}

// Satış konuşmasını bitir
async function endSaleConversation(userId) {
  console.log(`💰 Satış konuşması bitiriliyor: ${userId}`);
  
  const session = sessionManager.getUserSession(userId);
  const saleDuration = session?.saleStartTime ? Date.now() - session.saleStartTime : 0;
  
  logger.info(`Satış konuşması tamamlandı - Kullanıcı: ${userId}, Süre: ${saleDuration}ms`);
  
  sessionManager.updateUserSession(userId, {
    currentState: 'main_menu',
    inSaleConversation: false,
    saleStartTime: null,
    saleTimer: null
  });
}

// Satış istatistiklerini kaydet
function logSaleStatistics(userId, responseType, success = false) {
  const session = sessionManager.getUserSession(userId);
  const saleDuration = session?.saleStartTime ? Date.now() - session.saleStartTime : 0;
  
  const stats = {
    userId: userId,
    responseType: responseType,
    success: success,
    duration: saleDuration,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`Satış istatistiği: ${JSON.stringify(stats)}`);
  
  // İsteğe bağlı: Veritabanına veya dosyaya kaydet
  saveSaleStatsToFile(stats);
}

// Satış istatistiklerini dosyaya kaydet
function saveSaleStatsToFile(stats) {
  try {
    const statsDir = './sales_stats';
    if (!require('fs').existsSync(statsDir)) {
      require('fs').mkdirSync(statsDir, { recursive: true });
    }
    
    const filename = `sale_stats_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = require('path').join(statsDir, filename);
    
    let existingStats = [];
    if (require('fs').existsSync(filePath)) {
      const fileContent = require('fs').readFileSync(filePath, 'utf8');
      existingStats = JSON.parse(fileContent);
    }
    
    existingStats.push(stats);
    require('fs').writeFileSync(filePath, JSON.stringify(existingStats, null, 2), 'utf8');
    
  } catch (error) {
    logger.error(`Satış istatistiği kaydetme hatası: ${error.message}`);
  }
}

// Satış başarı oranını hesapla
function calculateSaleSuccessRate() {
  // Bu fonksiyon istatistik dosyalarını analiz edebilir
  // Şu anlık basit bir implementasyon
  return {
    totalConversations: 0,
    successfulSales: 0,
    successRate: 0
  };
}

module.exports = {
  startSaleConversation,
  endSaleConversation,
  logSaleStatistics,
  saveSaleStatsToFile,
  calculateSaleSuccessRate
};