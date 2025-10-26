// modules/serviceFlow.js - GÜNCELLENDİ (YEŞİL SİGORTA SATIŞ ATLAMA EKLENDİ)
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const sessionManager = require('./sessionManager');
const validationUtils = require('./validationUtils');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendServiceMessage(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
    console.log(`📨 Servis mesajı gönderildi: "${text.substring(0, 50)}..."`);
  } catch (error) {
    console.error('Servis mesajı gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(text);
  }
}

// Servis akışını başlat - GÜNCELLENDİ
async function startServiceFlow(message, service) {
  const serviceData = service.data;
  
  console.log(`🚀 Servis başlatılıyor: ${service.name}, Kategori: ${service.category}`);
  
  // FİYAT LİSTESİ İSE ÖZEL İŞLEM
  if (service.category === 'fiyat_listeleri') {
    await handlePriceList(message, service);
    return;
  }
  
  // NORMAL SERVİS İSE SORU-CEVAP AKIŞI
  sessionManager.updateUserSession(message.from, {
    currentService: service,
    currentQuestions: serviceData.questions || [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: serviceData.service_name,
    currentState: 'in_service'
  });

  await sendServiceMessage(message, serviceData.bot_greeting);
  
  const session = sessionManager.getUserSession(message.from);
  if (session.currentQuestions.length > 0) {
    await askNextQuestion(message, session);
  } else {
    await completeServiceFlow(message, session);
  }
}

// Fiyat listesi işleme - GÜNCELLENDİ (YEŞİL SİGORTA SATIŞ ATLAMA EKLENDİ)
async function handlePriceList(message, service) {
  const priceData = service.data;
  
  console.log(`💰 Fiyat listesi işleniyor: ${service.name}`, priceData);
  
  // JSON'daki mesajı direkt kullan
  let responseText = priceData.mesaj || 'Fiyat bilgisi bulunamadı.';
  
  // MESAJI GÖNDER
  console.log(`📨 Fiyat mesajı gönderiliyor: "${responseText}"`);
  await sendServiceMessage(message, responseText);
  
  // ✅ YEŞİL SİGORTA İSE SATIŞ TEKLİFİ ATLA
  if (service.name === 'yesil_sigorta_fiyatlari') {
    console.log('🌿 Yeşil sigorta - satış teklifi atlanıyor, ana menüye dönülüyor');
    
    // Doğrudan ana menüye dön
    const serviceLoader = require('./serviceLoader');
    const menuHandler = require('./menuHandler');
    
    setTimeout(async () => {
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
    }, 2000);
    
    return; // Fonksiyondan çık
  }
  
  // ❌ DİĞER FİYAT LİSTELERİ İÇİN SATIŞ TEKLİFİ (ESKİ KOD)
  setTimeout(async () => {
    try {
      const saleFlow = require('./saleFlow');
      await saleFlow.askForSale(message);
    } catch (error) {
      logger.error(`Satış teklifi hatası: ${error.message}`);
      console.log('❌ Satış teklifi gösterilemedi:', error.message);
      
      // Fallback: Ana menüye dön
      const serviceLoader = require('./serviceLoader');
      const menuHandler = require('./menuHandler');
      await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
    }
  }, 2000);
}

// Sonraki soruyu sor - GÜNCELLENDİ
async function askNextQuestion(message, session) {
  const currentQuestion = session.currentQuestions[session.currentQuestionIndex];
  
  if (currentQuestion) {
    let questionText = `📝 *Soru ${session.currentQuestionIndex + 1}/${session.currentQuestions.length}*\n\n`;
    questionText += `${currentQuestion.question}`;
    
    if (currentQuestion.field_type === 'number') {
      questionText += `\n\n💡 *Lütfen sadece sayı giriniz.*`;
    } else if (currentQuestion.field_type === 'date') {
      questionText += `\n\n💡 *Format: Gün/Ay/Yıl (Örnek: 15/01/2024)*`;
    } else if (currentQuestion.field_type === 'phone') {
      questionText += `\n\n💡 *Format: 5XX XXX XX XX*`;
    }
    
    await sendServiceMessage(message, questionText);
    
    sessionManager.updateUserSession(message.from, {
      currentState: 'collecting_answer',
      waitingForResponse: true
    });
  } else {
    await completeServiceFlow(message, session);
  }
}

// Cevabı işle - GÜNCELLENDİ
async function handleAnswer(message, answer, session) {
  const currentQuestion = session.currentQuestions[session.currentQuestionIndex];
  const fieldName = currentQuestion.field_name;
  
  const validationResult = validationUtils.validateAnswer(answer, currentQuestion.field_type);
  
  if (!validationResult.isValid) {
    await sendServiceMessage(message, `❌ ${validationResult.errorMessage}\n\nLütfen tekrar cevap verin:`);
    return false;
  }
  
  const updatedAnswers = {
    ...session.collectedAnswers,
    [fieldName]: validationResult.cleanedValue
  };
  
  sessionManager.updateUserSession(message.from, {
    collectedAnswers: updatedAnswers,
    currentQuestionIndex: session.currentQuestionIndex + 1
  });
  
  const updatedSession = sessionManager.getUserSession(message.from);
  if (updatedSession.currentQuestionIndex < updatedSession.currentQuestions.length) {
    await askNextQuestion(message, updatedSession);
  } else {
    await completeServiceFlow(message, updatedSession);
  }
  
  return true;
}

// Servis akışını tamamla - GÜNCELLENDİ
async function completeServiceFlow(message, session) {
  if (!session.currentService || !session.currentService.data) {
    console.log('❌ Servis verisi bulunamadı');
    await sendServiceMessage(message, '❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    
    const serviceLoader = require('./serviceLoader');
    const menuHandler = require('./menuHandler');
    await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
    return;
  }
  
  const serviceData = session.currentService.data;
  const serviceName = serviceData.service_name || session.currentService.name || 'Servis';
  
  console.log(`✅ Servis tamamlandı: ${serviceName}`);
  console.log(`📊 Toplanan cevaplar:`, session.collectedAnswers);
  
  let completionText = `🎉 *${serviceName}* başvurunuz tamamlandı!\n\n`;
  
  if (session.currentQuestions.length > 0) {
    completionText += `✅ Toplam ${session.currentQuestions.length} soru cevaplandı.\n\n`;
  }
  
  completionText += serviceData.completion_message || 'En kısa sürede size dönüş yapacağız.';

  await sendServiceMessage(message, completionText);
  
  // Sadece normal servisler için kaydet (fiyat listeleri değil)
  if (session.currentService.category !== 'fiyat_listeleri') {
    await saveServiceApplication(session);
  }
  
  sessionManager.updateUserSession(message.from, {
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {},
    serviceFlow: null
  });
  
  const serviceLoader = require('./serviceLoader');
  const menuHandler = require('./menuHandler');
  
  setTimeout(async () => {
    await menuHandler.showMainMenu(message, serviceLoader.loadAllServices());
  }, 2000);
}

// Servis başvurusunu kaydet
async function saveServiceApplication(session) {
  try {
    const applicationData = {
      service: session.serviceFlow,
      answers: session.collectedAnswers,
      timestamp: new Date().toISOString(),
      userId: session.userId
    };
    
    const applicationsDir = './applications';
    if (!fs.existsSync(applicationsDir)) {
      fs.mkdirSync(applicationsDir, { recursive: true });
    }
    
    const filename = `application_${Date.now()}_${session.userId.replace('@c.us', '')}.json`;
    fs.writeFileSync(
      path.join(applicationsDir, filename),
      JSON.stringify(applicationData, null, 2),
      'utf8'
    );
    
    logger.info(`Başvuru kaydedildi: ${filename}`);
    console.log(`📄 Başvuru kaydedildi: ${filename}`);
    
  } catch (error) {
    logger.error(`Başvuru kaydetme hatası: ${error.message}`);
    console.error('❌ Başvuru kaydetme hatası:', error);
  }
}

module.exports = {
  startServiceFlow,
  handlePriceList,
  askNextQuestion,
  handleAnswer,
  completeServiceFlow,
  saveServiceApplication
};