// modules/saleFlow/responseHandler.js - GÜNCELLENDİ
const logger = require('../logger');
const sessionManager = require('../sessionManager');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendSaleResponse(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    console.error('Satış cevabı gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(text);
  }
}

// Satış cevabını işleme - GÜNCELLENDİ
async function handleSaleResponse(message, response, services) {
  const cleanResponse = response.toLowerCase().trim();
  
  console.log(`💰 Satış cevabı işleniyor: "${cleanResponse}"`);
  
  // Olumlu cevaplar
  const positiveResponses = ['evet', 'yes', 'ok', 'tamam', 'başla', 'başlayalım', 'oluştur', 'yapalım', '✅', '👍'];
  
  // Olumsuz cevaplar
  const negativeResponses = ['hayır', 'no', 'yok', 'later', 'sonra', '❌', '👎'];
  
  if (isPositiveResponse(cleanResponse, positiveResponses)) {
    // Olumlu cevap - Yeşil Sigorta soru-cevap akışını başlat
    await handlePositiveResponse(message, services);
    
  } else if (isNegativeResponse(cleanResponse, negativeResponses)) {
    // Olumsuz cevap
    await handleNegativeResponse(message);
    
  } else {
    // Anlaşılamayan cevap
    await handleUnknownResponse(message);
  }
}

// Olumlu cevap kontrolü
function isPositiveResponse(response, positiveResponses) {
  return positiveResponses.some(pos => response.includes(pos));
}

// Olumsuz cevap kontrolü
function isNegativeResponse(response, negativeResponses) {
  return negativeResponses.some(neg => response.includes(neg));
}

// Olumlu cevap işleme - GÜNCELLENDİ
async function handlePositiveResponse(message, services) {
  await sendSaleResponse(message, '🎉 Harika! Yeşil Sigorta poliçenizi oluşturmaya başlıyorum...');
  
  // Yeşil Sigorta servisini bul
  const serviceFinder = require('./serviceFinder');
  const yesilSigortaService = serviceFinder.findYesilSigortaService(services);
  
  if (yesilSigortaService) {
    // Satış zamanlayıcısını temizle
    const timeoutManager = require('./timeoutManager');
    timeoutManager.clearSaleTimer(message.from);
    
    // Yeşil Sigorta akışını başlat
    const serviceFlow = require('../serviceFlow');
    await serviceFlow.startServiceFlow(message, yesilSigortaService);
  } else {
    await sendSaleResponse(message, '❌ Yeşil Sigorta servisi bulunamadı. Lütfen daha sonra tekrar deneyin.');
    await endConversation(message);
  }
}

// Olumsuz cevap işleme - GÜNCELLENDİ
async function handleNegativeResponse(message) {
  await sendSaleResponse(message, '👍 Anladım. Yeşil Sigorta ihtiyacınız olduğunda buradayım! 🛡️');
  await endConversation(message);
}

// Anlaşılamayan cevap işleme - GÜNCELLENDİ
async function handleUnknownResponse(message) {
  await sendSaleResponse(message, '❌ Anlayamadım. Lütfen *Evet* veya *Hayır* olarak cevap verin.\n\n' +
                     '✅ *Evet* - Poliçe oluşturmaya başlayalım\n' +
                     '❌ *Hayır* - Şimdilik sadece fiyat bilgisi yeterli');
}

// Konuşmayı bitir
async function endConversation(message) {
  const conversationManager = require('./conversationManager');
  await conversationManager.endSaleConversation(message.from);
  
  const serviceLoader = require('../serviceLoader');
  const menuHandler = require('../menuHandler');
  
  setTimeout(async () => {
    await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
  }, 3000);
}

module.exports = {
  handleSaleResponse,
  isPositiveResponse,
  isNegativeResponse,
  handlePositiveResponse,
  handleNegativeResponse,
  handleUnknownResponse,
  endConversation
};