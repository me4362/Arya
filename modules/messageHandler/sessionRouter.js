// modules/messageHandler/sessionRouter.js - CALLBACK VERSİYON
const sessionManager = require('../sessionManager');
const serviceLoader = require('../serviceLoader');
const menuHandler = require('../menuHandler');
const serviceFlow = require('../serviceFlow');
const greetingManager = require('./greetingManager');
const serviceMatcher = require('./serviceMatcher');
const messageParser = require('./messageParser');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendResponse(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    console.error('Alıntısız mesaj gönderme hatası, fallback kullanılıyor:', error.message);
    // Fallback: normal reply
    await message.reply(text);
  }
}

// modules/messageHandler/sessionRouter.js - BASİTLEŞTİRİLMİŞ AKIŞ
async function route(message, parsedMessage, contactName = '') {
  const { greetingPart, servicePart, cleanMessage, originalMessage } = parsedMessage;
  const services = serviceLoader.loadAllServices();
  const session = sessionManager.getUserSession(message.from);
  
  console.log(`🔍 Route: Durum=${session?.currentState}, Mesaj=${cleanMessage}`);
  
  // Servis bulundu callback'i kaldırıldı. Servis bulunursa, messageHandler'daki
  // serviceFound bayrağı route fonksiyonunun dışında ayarlanacak.
  
  // TEŞEKKÜR MESAJLARI - EN ÖNCELİKLİ
  if (messageParser.isThanksMessage(cleanMessage)) {
    console.log(`🙏 Teşekkür mesajı algılandı`);
    await greetingManager.handleThanks(message, contactName);
    return;
  }
  
  // VEDALAŞMA MESAJLARI - ÖNCELİKLİ
  if (messageParser.isGoodbyeMessage(cleanMessage)) {
    console.log(`👋 Vedalaşma mesajı algılandı`);
    await greetingManager.handleGoodbye(message, contactName);
    return;
  }
  
  // ÇIKIŞ KOMUTLARI - ÖNCELİKLİ
  if (isExitCommand(cleanMessage)) {
    console.log(`🚪 Çıkış komutu algılandı`);
    await handleExitCommand(message, services, contactName);
    return;
  }
  
  // DİĞER HİZMETLER İSTEĞİ - ÖNCELİKLİ
  if (messageParser.isOtherServicesRequest(cleanMessage)) {
    console.log(`🔄 Diğer hizmetler isteği algılandı`);
    await handleOtherServicesRequest(message, services, contactName);
    return;
  }
  
  // MENÜ İSTEĞİ - ÖNCELİKLİ
  if (messageParser.isMenuRequest(cleanMessage)) {
    console.log(`📋 Menü isteği algılandı`);
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    await menuHandler.showMainMenu(message, services);
    return;
  }
  
  // ÖNCE: Satış cevabı durumunu kontrol et
  if (session && session.currentState === 'waiting_for_sale_response') {
    const saleFlow = require('../saleFlow');
    await saleFlow.handleSaleResponse(message, cleanMessage, services);
    return;
  }
  
  // SONRA: Soru-cevap akışı
  if (session && session.currentState === 'collecting_answer') {
    const success = await serviceFlow.handleAnswer(message, cleanMessage, session);
    return;
  }
  
  // SAYI SEÇİMİ - ÖNCELİKLİ
  if (messageParser.isNumberInput(cleanMessage)) {
    const number = parseInt(cleanMessage);
    console.log(`🔢 Sayı seçimi algılandı: ${number}, Durum: ${session?.currentState}`);
    await menuHandler.handleNumberSelection(message, number, services);
    return;
  }
  
  // YARDIM İSTEĞİ
  if (messageParser.isHelpRequest(cleanMessage)) {
    console.log(`❓ Yardım isteği algılandı`);
    await handleHelpRequest(message, services, contactName);
    return;
  }
  
  // İPTAL İSTEĞİ
  if (messageParser.isCancelRequest(cleanMessage)) {
    console.log(`⏹️ İptal isteği algılandı`);
    await handleCancelRequest(message, services, contactName);
    return;
  }
  
  // Eğer selamlama varsa, önce selamla
  if (greetingPart && messageParser.isGreeting(greetingPart)) {
    await greetingManager.handleGreeting(message, services, contactName);
    
    // Eğer selamlamadan sonra işlem de varsa, 2 saniye bekle ve işlemi başlat
    if (servicePart && servicePart.length > 0) {
      setTimeout(async () => {
        await processServiceRequest(message, servicePart, services);
      }, 2000);
      return;
    }
    return;
  }
  
  // Sadece işlem varsa, direkt işlemi başlat
  if (servicePart && servicePart.length > 0) {
    await processServiceRequest(message, servicePart, services);
    return;
  }
  
  // Bilinmeyen mesaj - Hugging Face denenebilir (callback çağrılmaz)
  console.log('🔍 Bilinmeyen mesaj türü - Hugging Face denenebilir');
  await handleUnknownMessage(message, services, contactName);
}

// Process Service Request
async function processServiceRequest(message, serviceRequest, services) {
  console.log(`🔍 Servis isteği işleniyor: "${serviceRequest}"`);
  
  // Özel durumlar - servis olarak aranmamalı
  if (serviceRequest.toLowerCase().includes('menü') || serviceRequest.toLowerCase().includes('menu')) {
    console.log(`📋 Menü isteği - servis olarak aranmayacak`);
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    await menuHandler.showMainMenu(message, services);
    return;
  }
  
  // Anlamsız mesaj kontrolü
  if (isMeaninglessMessage(serviceRequest)) {
    console.log(`❓ Anlamsız mesaj algılandı`);
    await handleMeaninglessMessage(message, services);
    return;
  }
  
  const matchedService = serviceMatcher.findMatchingService(serviceRequest, services);
  
  if (matchedService) {
    console.log(`✅ Servis eşleşti: ${matchedService.type} - ${matchedService.name}`);
    
    // DİYALOG TİPİ CEVAPLAR İÇİN
    if (matchedService.type === 'diyalog') {
      await sendResponse(message, matchedService.data.cevap);
      return;
    }
    
    if (matchedService.type === 'category') {
      await menuHandler.showCategoryOptions(message, matchedService, services);
      sessionManager.updateUserSession(message.from, { currentState: `submenu_${matchedService.name}` });
    } else {
      await serviceFlow.startServiceFlow(message, matchedService);
    }
  } else {
    console.log(`❌ Servis eşleşmedi: "${serviceRequest}"`);
    // Servis bulunamadı - Hugging Face devreye girer
    await handleUnknownMessage(message, services);
  }
}

// Kalan fonksiyonlar aynı kalacak...
// [isExitCommand, handleExitCommand, handleOtherServicesRequest, handleHelpRequest, 
//  handleCancelRequest, isMeaninglessMessage, handleMeaninglessMessage, handleUnknownMessage]

// Çıkış komutu kontrolü
function isExitCommand(message) {
  const exitCommands = ['çıkış', 'çıkıs', 'exit', 'quit', 'geri', 'ana menü', 'ana menu', 'menüye dön', 'menuye don', 'back', 'return'];
  return exitCommands.some(cmd => message.includes(cmd));
}

// Çıkış komutu işleme
async function handleExitCommand(message, services, contactName = '') {
  sessionManager.updateUserSession(message.from, { 
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {}
  });
  
  const personalization = require('./personalization');
  const exitText = contactName ? 
    `👋 ${contactName}, ana menüye döndünüz!` :
    `👋 Ana menüye döndünüz!`;
  
  await sendResponse(message, exitText);
  await menuHandler.showMainMenu(message, services);
}

// Diğer hizmetler isteği işleme
async function handleOtherServicesRequest(message, services, contactName = '') {
  console.log(`🔍 Diğer hizmetler isteği algılandı`);
  
  const personalization = require('./personalization');
  const otherServicesText = contactName ? 
    `🔄 ${contactName}, diğer hizmetlerimizi gösteriyorum...` :
    `🔄 Diğer hizmetlerimizi gösteriyorum...`;
  
  await sendResponse(message, otherServicesText);
  
  // Ana menüyü göster
  sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
  await menuHandler.showMainMenu(message, services);
}

// Yardım isteği işleme
async function handleHelpRequest(message, services, contactName = '') {
  const personalization = require('./personalization');
  const helpText = contactName ? 
    `❓ ${contactName}, size nasıl yardımcı olabilirim?\n\n` :
    `❓ Size nasıl yardımcı olabilirim?\n\n`;
  
  await sendResponse(message, helpText +
    `• Bir hizmet adı yazın (örnek: "sigorta", "yazılım")\n` +
    `• "menü" yazarak tüm seçenekleri görebilirsiniz\n` +
    `• Sayı yazarak seçim yapabilirsiniz\n` +
    `• "çıkış" yazarak ana menüye dönebilirsiniz\n` +
    `• "teşekkür ederim" diyerek konuşmayı bitirebilirsiniz`);
}

// İptal isteği işleme
async function handleCancelRequest(message, services, contactName = '') {
  sessionManager.updateUserSession(message.from, { 
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {}
  });
  
  const personalization = require('./personalization');
  const cancelText = contactName ? 
    `⏹️ ${contactName}, işleminiz iptal edildi. Ana menüye döndünüz.` :
    `⏹️ İşleminiz iptal edildi. Ana menüye döndünüz.`;
  
  await sendResponse(message, cancelText);
  await menuHandler.showMainMenu(message, services);
}

// Anlamsız mesaj kontrolü
function isMeaninglessMessage(message) {
  const meaninglessPatterns = [
    /^[\u{1F600}-\u{1F64F}]+$/u, // Sadece emoji
    /^[^\w\s]+$/, // Sadece özel karakterler
    /^.{1,2}$/, // 1-2 karakter
    /^(.)\1+$/, // Aynı karakterin tekrarı (aaa, ???)
  ];
  
  return meaninglessPatterns.some(pattern => pattern.test(message));
}

// Anlamsız mesaj işleme
async function handleMeaninglessMessage(message, services) {
  await sendResponse(message, `🤔 Anlayamadım. Lütfen:\n\n` +
    `• Bir hizmet adı yazın\n` +
    `• "menü" yazarak seçenekleri görün\n` +
    `• "yardım" yazarak destek alın`);
}

// Bilinmeyen mesaj işleme
async function handleUnknownMessage(message, services, contactName = '') {
  const personalization = require('./personalization');
  const unknownText = personalization.createPersonalizedUnknownMessage(contactName);
  
  await sendResponse(message, `${unknownText}\n\n` +
    `• "sigorta" - Sigorta hizmetleri\n` +
    `• "yazılım" - Yazılım geliştirme\n` +
    `• "lojistik" - Nakliye hizmetleri\n` +
    `• "diğer hizmetler" - Tüm seçenekleri görün\n` +
    `• Veya diğer hizmetlerimiz...\n\n` +
    `Yardım için "menü" yazabilirsiniz.\n` +
    `Çıkmak için "çıkış" yazabilirsiniz.`);
}

module.exports = {
  route,
  processServiceRequest,
  handleUnknownMessage,
  handleExitCommand,
  handleOtherServicesRequest,
  handleHelpRequest,
  handleCancelRequest
};