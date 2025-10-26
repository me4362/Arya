// modules/messageHandler/sessionRouter.js - GÜNCELLENDİ (YENİ TIMER ENTEGRASYONU)
const sessionManager = require('../sessionManager');
const serviceLoader = require('../serviceLoader');
const menuHandler = require('../menuHandler');
const serviceFlow = require('../serviceFlow');
const greetingManager = require('./greetingManager');
const serviceMatcher = require('./serviceMatcher');
const messageParser = require('./messageParser');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

async function sendResponse(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    await message.reply(text);
  }
}

// Ana route fonksiyonu - YENİ TIMER ENTEGRASYONU
async function route(message, parsedMessage, contactName = '', onServiceFound = null) {
  const { greetingPart, servicePart, cleanMessage, originalMessage } = parsedMessage;
  const services = serviceLoader.loadAllServices();
  const session = sessionManager.getUserSession(message.from);
  
  console.log(`🔍 Route: Durum=${session?.currentState}, Mesaj=${cleanMessage}`);
  
  const serviceFound = () => {
    if (onServiceFound && typeof onServiceFound === 'function') {
      onServiceFound();
    }
  };
  
  // Kullanıcı cevap verdiğinde timer'ları durdur
  sessionManager.stopAllTimers(message.from);
  
  // TEŞEKKÜR MESAJLARI
  if (messageParser.isThanksMessage(cleanMessage)) {
    console.log(`🙏 Teşekkür mesajı algılandı`);
    serviceFound();
    await greetingManager.handleThanks(message, contactName);
    return;
  }
  
  // VEDALAŞMA MESAJLARI
  if (messageParser.isGoodbyeMessage(cleanMessage)) {
    console.log(`👋 Vedalaşma mesajı algılandı`);
    serviceFound();
    await greetingManager.handleGoodbye(message, contactName);
    return;
  }
  
  // ÇIKIŞ KOMUTLARI
  if (isExitCommand(cleanMessage)) {
    console.log(`🚪 Çıkış komutu algılandı`);
    serviceFound();
    await handleExitCommand(message, services, contactName);
    return;
  }
  
  // DİĞER HİZMETLER İSTEĞİ
  if (messageParser.isOtherServicesRequest(cleanMessage)) {
    console.log(`🔄 Diğer hizmetler isteği algılandı`);
    serviceFound();
    await handleOtherServicesRequest(message, services, contactName);
    return;
  }
  
  // MENÜ İSTEĞİ - YENİ: SEÇİM TIMER'I BAŞLAT
  if (messageParser.isMenuRequest(cleanMessage)) {
    console.log(`📋 Menü isteği algılandı`);
    serviceFound();
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    await menuHandler.showMainMenu(message, services);
    
    // YENİ: Menü gösterildikten sonra seçim timer'ını başlat
    sessionManager.startSelectionTimer(message.from, message, services);
    return;
  }
  
  // SATIŞ CEVABI DURUMU
  if (session && session.currentState === 'waiting_for_sale_response') {
    serviceFound();
    const saleFlow = require('../saleFlow');
    await saleFlow.handleSaleResponse(message, cleanMessage, services);
    return;
  }
  
  // SORU-CEVAP AKIŞI
  if (session && session.currentState === 'collecting_answer') {
    serviceFound();
    const success = await serviceFlow.handleAnswer(message, cleanMessage, session);
    return;
  }
  
  // SAYI SEÇİMİ
  if (messageParser.isNumberInput(cleanMessage)) {
    const number = parseInt(cleanMessage);
    console.log(`🔢 Sayı seçimi algılandı: ${number}`);
    serviceFound();
    await menuHandler.handleNumberSelection(message, number, services);
    return;
  }
  
  // YARDIM İSTEĞİ
  if (messageParser.isHelpRequest(cleanMessage)) {
    console.log(`❓ Yardım isteği algılandı`);
    serviceFound();
    await handleHelpRequest(message, services, contactName);
    return;
  }
  
  // İPTAL İSTEĞİ
  if (messageParser.isCancelRequest(cleanMessage)) {
    console.log(`⏹️ İptal isteği algılandı`);
    serviceFound();
    await handleCancelRequest(message, services, contactName);
    return;
  }
  
  // Eğer selamlama varsa
  if (greetingPart && messageParser.isGreeting(greetingPart)) {
    serviceFound();
    await greetingManager.handleGreeting(message, services, contactName);
    
    // Eğer selamlamadan sonra işlem de varsa
    if (servicePart && servicePart.length > 0) {
      setTimeout(async () => {
        await processServiceRequest(message, servicePart, services, serviceFound);
      }, 2000);
      return;
    }
    return;
  }
  
  // Sadece işlem varsa
  if (servicePart && servicePart.length > 0) {
    await processServiceRequest(message, servicePart, services, serviceFound);
    return;
  }
  
  // Bilinmeyen mesaj
  console.log('🔍 Bilinmeyen mesaj türü');
  await handleUnknownMessage(message, services, contactName);
}

// Kalan fonksiyonlar aynı kalacak...
async function processServiceRequest(message, serviceRequest, services, serviceFound = null) {
  console.log(`🔍 Servis isteği işleniyor: "${serviceRequest}"`);
  
  if (serviceRequest.toLowerCase().includes('menü') || serviceRequest.toLowerCase().includes('menu')) {
    console.log(`📋 Menü isteği - servis olarak aranmayacak`);
    if (serviceFound) serviceFound();
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    await menuHandler.showMainMenu(message, services);
    
    // YENİ: Seçim timer'ını başlat
    sessionManager.startSelectionTimer(message.from, message, services);
    return;
  }
  
  if (isMeaninglessMessage(serviceRequest)) {
    console.log(`❓ Anlamsız mesaj algılandı`);
    if (serviceFound) serviceFound();
    await handleMeaninglessMessage(message, services);
    return;
  }
  
  const matchedService = serviceMatcher.findMatchingService(serviceRequest, services);
  
  if (matchedService) {
    console.log(`✅ Servis eşleşti: ${matchedService.type} - ${matchedService.name}`);
    if (serviceFound) serviceFound();
    
    if (matchedService.type === 'diyalog') {
      await sendResponse(message, matchedService.data.cevap);
    } else if (matchedService.type === 'category') {
      await menuHandler.showCategoryOptions(message, matchedService, services);
      sessionManager.updateUserSession(message.from, { currentState: `submenu_${matchedService.name}` });
      
      // YENİ: Seçim timer'ını başlat
      sessionManager.startSelectionTimer(message.from, message, services);
    } else {
      await serviceFlow.startServiceFlow(message, matchedService);
    }
  } else {
    console.log(`❌ Servis eşleşmedi: "${serviceRequest}"`);
    await handleUnknownMessage(message, services);
  }
}

// Diğer yardımcı fonksiyonlar (isExitCommand, handleExitCommand, vb.) aynı kalacak...
function isExitCommand(message) {
  const exitCommands = ['çıkış', 'çıkıs', 'exit', 'quit', 'geri', 'ana menü', 'ana menu', 'menüye dön', 'menuye don', 'back', 'return'];
  return exitCommands.some(cmd => message.includes(cmd));
}

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
  
  // YENİ: Seçim timer'ını başlat
  sessionManager.startSelectionTimer(message.from, message, services);
}

async function handleOtherServicesRequest(message, services, contactName = '') {
  console.log(`🔍 Diğer hizmetler isteği algılandı`);
  
  const personalization = require('./personalization');
  const otherServicesText = contactName ? 
    `🔄 ${contactName}, diğer hizmetlerimizi gösteriyorum...` :
    `🔄 Diğer hizmetlerimizi gösteriyorum...`;
  
  await sendResponse(message, otherServicesText);
  
  sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
  await menuHandler.showMainMenu(message, services);
  
  // YENİ: Seçim timer'ını başlat
  sessionManager.startSelectionTimer(message.from, message, services);
}

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
  
  // YENİ: Seçim timer'ını başlat
  sessionManager.startSelectionTimer(message.from, message, services);
}

function isMeaninglessMessage(message) {
  const meaninglessPatterns = [
    /^[\u{1F600}-\u{1F64F}]+$/u,
    /^[^\w\s]+$/,
    /^.{1,2}$/,
    /^(.)\1+$/,
  ];
  
  return meaninglessPatterns.some(pattern => pattern.test(message));
}

async function handleMeaninglessMessage(message, services) {
  await sendResponse(message, `🤔 Anlayamadım. Lütfen:\n\n` +
    `• Bir hizmet adı yazın\n` +
    `• "menü" yazarak seçenekleri görün\n` +
    `• "yardım" yazarak destek alın`);
}

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