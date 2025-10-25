// modules/saleFlow.js - ANA YÖNLENDİRİCİ DOSYA
const saleManager = require('./saleFlow/saleManager');
const responseHandler = require('./saleFlow/responseHandler');
const serviceFinder = require('./saleFlow/serviceFinder');
const conversationManager = require('./saleFlow/conversationManager');
const timeoutManager = require('./saleFlow/timeoutManager');

// Satış teklifi sorma
async function askForSale(message) {
  await saleManager.askForSale(message);
}

// Servise özel satış teklifi sorma
async function askServiceSpecificSale(message, serviceName) {
  await saleManager.askServiceSpecificSale(message, serviceName);
}

// Satış cevabını işleme
async function handleSaleResponse(message, response, services) {
  await responseHandler.handleSaleResponse(message, response, services);
}

// Satış zaman aşımı işleme
async function handleSaleTimeout(userId) {
  await timeoutManager.handleSaleTimeout(userId);
}

// Yeşil Sigorta servisini bul
function findYesilSigortaService(services) {
  return serviceFinder.findYesilSigortaService(services);
}

// Satış konuşmasını başlat
function startSaleConversation(userId) {
  conversationManager.startSaleConversation(userId);
}

// Satış konuşmasını bitir
async function endSaleConversation(userId) {
  await conversationManager.endSaleConversation(userId);
}

// Satış timer'ını temizle
function clearSaleTimer(userId) {
  timeoutManager.clearSaleTimer(userId);
}

// Tüm satış timer'larını temizle
function clearAllSaleTimers() {
  timeoutManager.clearAllSaleTimers();
}

// Satış istatistiklerini kaydet
function logSaleStatistics(userId, responseType, success = false) {
  conversationManager.logSaleStatistics(userId, responseType, success);
}

module.exports = {
  // Ana fonksiyonlar
  askForSale,
  askServiceSpecificSale,
  handleSaleResponse,
  handleSaleTimeout,
  
  // Yardımcı fonksiyonlar
  findYesilSigortaService,
  startSaleConversation,
  endSaleConversation,
  clearSaleTimer,
  clearAllSaleTimers,
  logSaleStatistics,
  
  // Alt modüllere erişim için
  saleManager,
  responseHandler,
  serviceFinder,
  conversationManager,
  timeoutManager
};