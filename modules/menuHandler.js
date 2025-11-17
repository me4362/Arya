// modules/menuHandler.js - TEK SEFER MENÜ + 5 DAKİKA TIMER
const mainMenu = require('./menuHandler/mainMenu');
const subMenu = require('./menuHandler/subMenu');
const numberHandler = require('./menuHandler/numberHandler');
const serviceConverter = require('./menuHandler/serviceConverter');
const categoryManager = require('./menuHandler/categoryManager');
const navigation = require('./menuHandler/navigation');
const sessionManager = require('./sessionManager');
const logger = require('./logger');

// Ana menü göster - YENİDEN YAZILDI (TEK SEFER + 5 DAKİKA)
async function showMainMenu(message, services) {
  try {
    const userId = message.from;
    const session = sessionManager.getUserSession(userId);
    
    // Eğer menü zaten gösterildiyse, tekrar gösterme
    if (session.menuShown) {
      logger.info(`📋 Menü zaten gösterilmiş - Tekrar gösterilmiyor: ${userId}`);
      return;
    }
    
    // Önceki timer'ları temizle
    sessionManager.stopMenuTimer(userId);
    sessionManager.stopHelpTimer(userId);
    
    // Menüyü göster
    await mainMenu.showMainMenu(message, services);
    
    // 5 dakika timer'ını başlat (sadece bir defa)
    sessionManager.startMenuTimer(userId, message, services);
    
    logger.info(`📋 Menü gösterildi - 5 dakika timer başlatıldı: ${userId}`);
    
  } catch (error) {
    logger.error('Menü gösterim hatası:', error);
    // Fallback: sadece menüyü göster
    try {
      await mainMenu.showMainMenu(message, services);
    } catch (fallbackError) {
      logger.error('Fallback menü gösterim hatası:', fallbackError);
    }
  }
}

// Sayı seçimini işle - GÜNCELLENDİ
async function handleNumberSelection(message, number, services) {
  try {
    const userId = message.from;
    
    // Menü timer'ını durdur (kullanıcı tepki verdi)
    sessionManager.stopMenuTimer(userId);
    
    await numberHandler.handleNumberSelection(message, number, services);
  } catch (error) {
    logger.error('Sayı seçim hatası:', error);
    await sendReply(message, '❌ İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
  }
}

// Alt menü seçimini işle - GÜNCELLENDİ
async function handleSubMenuSelection(message, number, categoryName, services) {
  try {
    const userId = message.from;
    
    // Menü timer'ını durdur (kullanıcı tepki verdi)
    sessionManager.stopMenuTimer(userId);
    
    const categoryData = services[categoryName];
    if (!categoryData || !categoryData.services) {
      await sendReply(message, '❌ Bu kategoriye ait hizmet bulunamadı.');
      await returnToMainMenu(message, services);
      return;
    }

    const serviceIndex = number - 1;
    const serviceList = Object.values(categoryData.services);

    if (serviceIndex >= 0 && serviceIndex < serviceList.length) {
      const selectedService = serviceList[serviceIndex];
      const serviceKey = Object.keys(categoryData.services)[serviceIndex];

      logger.info(`✅ Alt menü seçildi: ${selectedService.name} (${serviceKey})`);

      // YEŞİL SİGORTA kontrolü
      if (serviceKey === 'yesil_sigorta' || selectedService.name.toLowerCase().includes('yeşil sigorta')) {
        logger.info(`🔄 Yeşil Sigorta menü seçimi -> fiyat listesine yönlendiriliyor`);
        
        if (services['fiyat_listeleri'] && services['fiyat_listeleri']['yesil_sigorta_fiyatlari']) {
          const priceService = services['fiyat_listeleri']['yesil_sigorta_fiyatlari'];
          await handleServiceSelection(message, priceService, 'fiyat_listeleri', 'yesil_sigorta_fiyatlari');
        } else {
          await sendReply(message, '❌ Yeşil Sigorta fiyat listesi şu an mevcut değil.');
          await returnToMainMenu(message, services);
        }
        return;
      }
      
      await handleServiceSelection(message, selectedService, categoryName, serviceKey);
    } else {
      await sendReply(message, '❌ Geçersiz seçim. Lütfen menüdeki numaralardan birini girin.');
      await returnToMainMenu(message, services);
    }
  } catch (error) {
    logger.error('Alt menü seçim hatası:', error);
    await sendReply(message, '❌ İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    await returnToMainMenu(message, services);
  }
}

// Servis seçimini işle - GÜNCELLENDİ
async function handleServiceSelection(message, serviceData, category, serviceName) {
  try {
    const userId = message.from;
    
    logger.info(`🚀 Servis seçimi: ${serviceName}, Kategori: ${category}`);

    // Menü timer'ını durdur (servis başlıyor)
    sessionManager.stopMenuTimer(userId);

    // YEŞİL SİGORTA kontrolü
    if (serviceName === 'yesil_sigorta') {
      logger.info(`🔄 Yeşil Sigorta servisi -> fiyat listesine yönlendiriliyor`);
      
      const services = require('./serviceLoader').loadAllServices();
      if (services['fiyat_listeleri'] && services['fiyat_listeleri']['yesil_sigorta_fiyatlari']) {
        const priceService = services['fiyat_listeleri']['yesil_sigorta_fiyatlari'];
        await handleServiceSelection(message, priceService, 'fiyat_listeleri', 'yesil_sigorta_fiyatlari');
        return;
      }
    }

    const serviceFlow = require('./serviceFlow');
    await serviceFlow.startServiceFlow(message, {
      type: 'service',
      data: serviceData,
      category: category,
      name: serviceName
    });
    
  } catch (error) {
    logger.error('Servis seçim hatası:', error);
    await sendReply(message, '❌ Servis başlatılırken bir hata oluştu. Lütfen tekrar deneyin.');
    await returnToMainMenu(message, require('./serviceLoader').loadAllServices());
  }
}

// Kategori seçeneklerini göster - GÜNCELLENDİ
async function showCategoryOptions(message, category, services) {
  try {
    const userId = message.from;
    
    // Yeni timer başlat
    sessionManager.startMenuTimer(userId, message, services);
    
    await subMenu.showCategoryOptions(message, category, services);
  } catch (error) {
    logger.error('Kategori seçenekleri gösterim hatası:', error);
    await sendReply(message, '❌ Kategori yüklenirken bir hata oluştu.');
  }
}

// Ana menüye dön - GÜNCELLENDİ
async function returnToMainMenu(message, services, contactName = '') {
  try {
    const userId = message.from;
    
    // Timer'ları temizle ve yeni menü timer'ı başlat
    sessionManager.stopMenuTimer(userId);
    sessionManager.stopHelpTimer(userId);
    
    await navigation.returnToMainMenu(message, services, contactName);
    
    // Yeni menü timer'ı başlat (sadece menü gösterilmediyse)
    const session = sessionManager.getUserSession(userId);
    if (!session.menuShown) {
      sessionManager.startMenuTimer(userId, message, services);
    }
    
  } catch (error) {
    logger.error('Ana menüye dönüş hatası:', error);
    // Fallback: basit mesaj gönder
    await sendReply(message, '🏠 Ana menüye dönülüyor...');
  }
}

// Servis tamamlandıktan sonra ana menüye dön - YENİ FONKSİYON
async function returnToMainMenuAfterService(message, services, contactName = '') {
  try {
    const userId = message.from;
    
    logger.info(`🔄 Servis tamamlandı, ana menüye dönülüyor: ${userId}`);
    
    // Oturumu sıfırla (menü gösterilmedi olarak)
    sessionManager.resetUserSession(userId);
    
    // Ana menüyü göster (timer otomatik başlayacak)
    await showMainMenu(message, services);
    
  } catch (error) {
    logger.error('Servis sonrası ana menüye dönüş hatası:', error);
    await sendReply(message, '✅ İşleminiz tamamlandı! Size başka nasıl yardımcı olabilirim?');
  }
}

// Servis anahtarını dönüştür
function convertToServiceKey(categoryName) {
  return serviceConverter.convertToServiceKey(categoryName);
}

// Yardımcı fonksiyon: Mesaj gönderme
async function sendReply(message, text) {
  const { sendMessageWithoutQuote } = require('./utils/globalClient');
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    logger.error('Mesaj gönderme hatası:', error);
    try {
      await message.reply(text);
    } catch (secondError) {
      logger.error('Yedek mesaj gönderme de başarısız:', secondError);
    }
  }
}

module.exports = {
  showMainMenu,
  handleNumberSelection,
  handleSubMenuSelection,
  handleServiceSelection,
  showCategoryOptions,
  convertToServiceKey,
  returnToMainMenu,
  returnToMainMenuAfterService, // YENİ FONKSİYON
  
  // Alt modüllere erişim için
  mainMenu,
  subMenu,
  numberHandler,
  serviceConverter,
  categoryManager,
  navigation
};
