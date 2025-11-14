// modules/messageHandler.js - BASİTLEŞTİRİLMİŞ VERSİYON
const logger = require('./logger');
const messageParser = require('./messageHandler/messageParser');
const sessionRouter = require('./messageHandler/sessionRouter');
const contactManager = require('./messageHandler/contactManager');
const validation = require('./messageHandler/validation');
const errorHandler = require('./messageHandler/errorHandler');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// Hugging Face Asistanını ekle
const HuggingFaceAsistan = require('../huggingface-asistan');
const hfAsistan = new HuggingFaceAsistan();

// Global servis durumu değişkeni - basit çözüm
let serviceFound = false;

// Buffer'ı hemen işle
async function processCombinedMessage(message, combinedMessage, contactInfo) {
  const sessionManager = require('./sessionManager');
  
  try {
    console.log(`🎯 Birleştirilmiş mesaj işleniyor: "${combinedMessage}"`);
    
    // 1. İşleme bayrağını ayarla
    sessionManager.setIsProcessingBuffer(message.from, true);
    
    // 2. Mesajı ayrıştır
    const parsedMessage = messageParser.parseMessage(combinedMessage);
    
    console.log(`📝 Birleştirilmiş mesaj ayrıştırma: Orijinal="${combinedMessage}", Selamlama="${parsedMessage.greetingPart}", İşlem="${parsedMessage.servicePart}"`);
    
    // 3. Oturum durumuna göre yönlendir
    await sessionRouter.route(message, parsedMessage, contactInfo.name, () => {
      // Callback: servis bulunduğunda çağrılacak
      serviceFound = true;
      console.log('✅ Servis bulundu - Hugging Face atlanacak');
    });
    
    // 4. Eğer modüler sistem servis bulamazsa, Hugging Face'e yönlendir
    if (!serviceFound) {
      console.log('🔍 Modüler sistem servis bulamadı, Hugging Face deneniyor...');
      const hfSuccess = await generateHuggingFaceResponse(message);
      
      if (!hfSuccess) {
        // Hugging Face de başarısız olursa genel hata mesajı
        await sendReply(message, '❌ Üzgünüm, bu konuda size yardımcı olamadım. Lütfen tekrar deneyin veya "menü" yazarak hizmetlerimizi görün.');
      }
    }
  } catch (error) {
    console.error('❌ processCombinedMessage hatası:', error);
    // Hata durumunda da bayrağı sıfırla
    await sendReply(message, '❌ Mesaj işlenirken beklenmedik bir hata oluştu.');
  } finally {
    // 5. İşleme bitti, bayrağı sıfırla
    sessionManager.setIsProcessingBuffer(message.from, false);
  }
}

// Aktif işlem durumunu kontrol et
function isActiveProcessState(state) {
  const activeStates = [
    'waiting_for_service',
    'waiting_for_response', 
    'service_flow',
    'question_flow',
    'collecting_info',
    'processing_order'
  ];
  
  return activeStates.some(activeState => state.includes(activeState));
}

// Özel komut kontrolü
function isImmediateCommand(message) {
  const immediateCommands = [
    'menü', 'menu', 'yardım', 'yardim', 'help', 
    'çıkış', 'çıkıs', 'exit', 'geri', 'back',
    'iptal', 'cancel', 'teşekkür', 'tesekkur', 'sağol', 'sagol',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', // Sayılar
    'evet', 'hayır', 'tamam', 'ok' // Hızlı cevaplar
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return immediateCommands.some(cmd => cleanMessage.includes(cmd));
}

// Akıllı buffer birleştirme kararı
function shouldCombineMessages(newMessage, existingBuffer) {
  if (existingBuffer.length === 0) return false;
  
  const lastMessage = existingBuffer[existingBuffer.length - 1];
  const combinedText = existingBuffer.join(' ') + ' ' + newMessage;
  
  console.log(`🔍 Buffer analizi: Son mesaj="${lastMessage}", Yeni="${newMessage}"`);
  
  // 1. Kısa mesajlar hemen birleştirilsin (sohbet devamı)
  const isShortSequence = newMessage.length < 20 && lastMessage.length < 20;
  
  // 2. Noktalama ile bitiyorsa veya başlıyorsa birleştir
  const hasPunctuationContinuation = (
    lastMessage.endsWith('.') || 
    lastMessage.endsWith(',') ||
    newMessage.startsWith('ve ') ||
    newMessage.startsWith('ama ') ||
    newMessage.startsWith('sonra ') ||
    newMessage.startsWith('yani ')
  );
  
  // 3. Aynı konu devam ediyorsa birleştir
  const commonTopics = ['sigorta', 'fiyat', 'ücret', 'kasko', 'trafik', 'yeşil', 'yesil', 'hizmet', 'yardım'];
  const hasCommonTopic = commonTopics.some(topic => 
    lastMessage.toLowerCase().includes(topic) && newMessage.toLowerCase().includes(topic)
  );
  
  // 4. Toplam karakter sınırı (çok uzun olmasın)
  const isWithinLengthLimit = combinedText.length < 200;
  
  const shouldCombine = (isShortSequence || hasPunctuationContinuation || hasCommonTopic) && isWithinLengthLimit;
  
  console.log(`📊 Birleştirme kararı: Kısa=${isShortSequence}, Noktalama=${hasPunctuationContinuation}, Konu=${hasCommonTopic}, Uzunluk=${isWithinLengthLimit} → ${shouldCombine ? 'BİRLEŞTİR' : 'BEKLE'}`);
  
  return shouldCombine;
}

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendReply(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
    logger.info(`📤 Mesaj gönderildi (alıntısız): ${message.from}`);
  } catch (error) {
    logger.error(`Mesaj gönderme hatası: ${error.message}`);
    // Fallback: normal reply kullan
    try {
      await message.reply(text);
    } catch (fallbackError) {
      logger.error(`Fallback mesaj gönderme de başarısız: ${fallbackError.message}`);
    }
  }
}

// Hugging Face ile yanıt oluştur
async function generateHuggingFaceResponse(message) {
  try {
    console.log('🤖 Hugging Face ile yanıt oluşturuluyor...');
    const hfResponse = await hfAsistan.generateResponse(message.body);
    console.log(`💬 Hugging Face Yanıtı: "${hfResponse}"`);
    await sendReply(message, hfResponse);
    return true;
  } catch (hfError) {
    console.error('❌ Hugging Face yanıt hatası:', hfError);
    return false;
  }
}

// Servis durumunu kontrol et (basit fonksiyon)
function checkServiceFound() {
  return serviceFound;
}

// Ana mesaj işleme fonksiyonu - BUFFER SİSTEMİ EKLENDİ
async function handleMessage(message) {
  try {
    // Servis bulma durumunu sıfırla
    serviceFound = false;
    
    // 1. Mesajı doğrula
    const validationResult = validation.validateMessage(message);
    if (!validationResult.isValid) {
      if (validationResult.reason === 'has_media') {
        await errorHandler.handleMediaError(message);
      }
      return;
    }

    // 2. Müşteri bilgilerini al ve logla
    const contactInfo = await contactManager.logContactInteraction(message, 'Mesaj alındı');
    
    // 3. Oturumu başlat/güncelle
    const sessionManager = require('./sessionManager');
    let session = sessionManager.getUserSession(message.from);
    
    console.log(`🔍 Oturum durumu: ${session.currentState}, Mesaj: "${validationResult.messageBody}"`);
    console.log(`📊 Buffer durumu: ${sessionManager.getBufferStatus(message.from).bufferSize} mesaj, İşleniyor: ${session.isProcessingBuffer}`);
    
    // 4. Kullanıcı cevap verdiğinde tüm timer'ları durdur
    sessionManager.stopHelpTimer(message.from);
    sessionManager.stopMenuTimer(message.from);
    
    // 5. Buffer kontrolü - eğer buffer işleniyorsa bekle
    if (session.isProcessingBuffer) {
      console.log(`⏳ Buffer işleniyor, yeni mesaj bekleniyor...`);
      return;
    }
    
    // 6. AKTİF İŞLEM BYPASS - Eğer kullanıcı aktif işlem yapıyorsa buffer'ı atla
    if (isActiveProcessState(session.currentState)) {
      console.log(`⚡ Aktif işlem tespit edildi - Buffer bypass: ${session.currentState}`);
      
      // Mesajı hemen işle
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    // 7. Özel komut bypass - Hemen işle
    const isSpecialCommand = isImmediateCommand(validationResult.messageBody);
    if (isSpecialCommand) {
      console.log(`⚡ Özel komut tespit edildi - Buffer bypass: "${validationResult.messageBody}"`);
      
      // Mesajı hemen işle
      await processCombinedMessage(message, validationResult.messageBody, contactInfo);
      return;
    }
    
    // 8. Buffer'a mesaj ekle
    sessionManager.addToMessageBuffer(message.from, validationResult.messageBody);
    
    // Buffer durumunu kontrol et
    const bufferStatus = sessionManager.getBufferStatus(message.from);
    console.log(`📥 Buffer'a eklendi: ${bufferStatus.bufferSize} mesaj -> "${bufferStatus.bufferContent}"`);
    
    // 9. Akıllı buffer birleştirme kararı
    const shouldCombine = shouldCombineMessages(validationResult.messageBody, session.messageBuffer);
    
    // Eğer buffer'da 1 mesaj varsa ve birleştirme gerekmiyorsa, timer'ı bekleyelim
    if (!isSpecialCommand && bufferStatus.bufferSize === 1 && !shouldCombine) {
      console.log(`⏰ İlk mesaj, 7 saniye bekleniyor...`);
      return; // Timer bitene kadar bekle
    }
    
    // Özel komutlar, 2+ mesaj veya birleştirme gerekliyse hemen işle
    if (isSpecialCommand || bufferStatus.bufferSize > 1 || shouldCombine) {
      // Buffer'ı hemen işle
      const combinedMessage = sessionManager.processMessageBuffer(message.from);
      
      if (combinedMessage) {
        console.log(`🔄 Buffer işlendi: "${combinedMessage}"`);
        await processCombinedMessage(message, combinedMessage, contactInfo);
      }
    }
    
  } catch (error) {
    console.log(`❌ Mesaj işleme hatası: ${error.message}`);
    
    // Hata durumunda Hugging Face'i dene
    console.log('🔄 Hata durumunda Hugging Face deneniyor...');
    try {
      const hfSuccess = await generateHuggingFaceResponse(message);
      if (!hfSuccess) {
        await errorHandler.handleError(message, error);
      }
    } catch (finalError) {
      await errorHandler.handleError(message, finalError);
    }
  }
}

module.exports = {
  handleMessage,
  sendReply,
  checkServiceFound,
  generateHuggingFaceResponse,
  getTimeBasedGreeting: require('./messageHandler/greetingManager').getTimeBasedGreeting,
  isGreeting: messageParser.isGreeting,
  parseMessage: messageParser.parseMessage,
  handleGreeting: require('./messageHandler/greetingManager').handleGreeting,
  findMatchingService: require('./messageHandler/serviceMatcher').findMatchingService,
  createPersonalizedGreeting: require('./messageHandler/personalization').createPersonalizedGreeting,
  // YENİ BUFFER FONKSİYONLARI
  processCombinedMessage,
  isActiveProcessState,
  isImmediateCommand,
  shouldCombineMessages
};