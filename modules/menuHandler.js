// modules/menuHandler.js - ANA YÖNLENDİRİCİ DOSYA (KURUMSAL YAKLAŞIM)
const mainMenu = require('./menuHandler/mainMenu');
const subMenu = require('./menuHandler/subMenu');
const numberHandler = require('./menuHandler/numberHandler');
const serviceConverter = require('./menuHandler/serviceConverter');
const categoryManager = require('./menuHandler/categoryManager');
const navigation = require('./menuHandler/navigation');
const { sendMessageWithoutQuote } = require('./utils/globalClient');

// Yardımcı fonksiyon: Mesaj gönderme
async function sendReply(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    // Fallback: normal reply
    try {
      await message.reply(text);
    } catch (fallbackError) {
      console.error(`Fallback mesaj gönderme hatası: ${fallbackError.message}`);
    }
  }
}

// ✅ YENİ: Kurumsal ana menü mesajı
async function sendCorporateMainMenu(message, services) {
  try {
    const menuText = `🏢 *PlanB Global Network Ltd* - Profesyonel Hizmetler\n\n` +
                    `🛎️ *Size nasıl yardımcı olabilirim?*\n\n` +
                    `📍 *Ana Hizmet Kategorilerimiz:*\n` +
                    `1️⃣ Sigorta Hizmetleri\n` +
                    `2️⃣ Yazılım Geliştirme\n` +
                    `3️⃣ Siber Güvenlik\n` +
                    `4️⃣ Lojistik Hizmetleri\n` +
                    `5️⃣ İthalat/İhracat\n` +
                    `6️⃣ Danışmanlık Hizmetleri\n` +
                    `7️⃣ Diğer Hizmetler\n\n` +
                    `💡 *İstediğiniz kategori numarasını yazın veya hizmet adını belirtin*\n\n` +
                    `ℹ️ *"yardım"* yazarak destek alabilirsiniz.`;

    await sendReply(message, menuText);
    console.log(`🏢 Kurumsal ana menü gönderildi: ${message.from}`);
    
  } catch (error) {
    console.error(`❌ Kurumsal menü gönderme hatası: ${error.message}`);
    // Fallback: orijinal menü
    await mainMenu.showMainMenu(message, services);
  }
}

// ✅ GÜNCELLENDİ: Ana menü göster - KURUMSAL YAKLAŞIM
async function showMainMenu(message, services) {
  try {
    const sessionManager = require('./sessionManager');
    
    // Önceki timer'ı durdur (yeniden başlatmak için)
    sessionManager.stopMenuGoodbyeTimer(message.from);
    
    // ✅ DEĞİŞİKLİK: Kurumsal menü göster
    await sendCorporateMainMenu(message, services);
    
    // 6 dakika timer'ını başlat
    sessionManager.startMenuGoodbyeTimer(message.from, message);
    
    // Oturum durumunu güncelle
    sessionManager.updateUserSession(message.from, {
      currentState: 'waiting_for_service',
      waitingForResponse: true
    });
    
    console.log(`📋 Kurumsal menü gösterildi - 6 dakika timer başlatıldı: ${message.from}`);
    
  } catch (error) {
    console.error('Menü gösterim hatası:', error);
    // Fallback: normal menü gösterimi
    await mainMenu.showMainMenu(message, services);
  }
}

// ✅ GÜNCELLENDİ: Sayı seçimini işle - KURUMSAL YAKLAŞIM
async function handleNumberSelection(message, number, services) {
  try {
    console.log(`🔢 Sayı seçimi işleniyor: ${number} - Kullanıcı: ${message.from}`);
    
    const sessionManager = require('./sessionManager');
    const session = sessionManager.getUserSession(message.from);
    
    // Timer'ları sıfırla
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    
    // Sayıya göre kategori yönlendirme
    switch (number) {
      case 1:
        await showCategoryOptions(message, 'sigorta_ana_kategori', services);
        break;
      case 2:
        await showCategoryOptions(message, 'yazilim_gelistirme', services);
        break;
      case 3:
        await showCategoryOptions(message, 'siber_guvenlik', services);
        break;
      case 4:
        await showCategoryOptions(message, 'lojistik_hizmetleri', services);
        break;
      case 5:
        await showCategoryOptions(message, 'ithalat_ihracat', services);
        break;
      case 6:
        await showCategoryOptions(message, 'danismanlik_hizmetleri', services);
        break;
      case 7:
        await showOtherServices(message, services);
        break;
      case 0:
        await showMainMenu(message, services);
        break;
      default:
        await sendReply(message, `❌ Geçersiz seçim. Lütfen 1-7 arası bir numara girin veya *"menü"* yazarak ana menüye dönün.`);
        await showMainMenu(message, services);
    }
    
  } catch (error) {
    console.error(`Sayı seçim işleme hatası: ${error.message}`);
    await sendReply(message, `❌ Bir hata oluştu. Lütfen tekrar deneyin.`);
    await showMainMenu(message, services);
  }
}

// ✅ YENİ: Diğer hizmetler menüsü
async function showOtherServices(message, services) {
  const otherServicesText = `🔧 *Diğer Profesyonel Hizmetlerimiz*\n\n` +
                           `7️⃣ Diğer Hizmetler:\n\n` +
                           `• Dijital Pazarlama\n` +
                           `• Web Tasarım\n` +
                           `• SEO Hizmetleri\n` +
                           `• E-ticaret Çözümleri\n` +
                           `• Bulut Bilişim\n` +
                           `• Veri Analizi\n` +
                           `• Özel Yazılım Çözümleri\n\n` +
                           `💡 *İhtiyacınız olan hizmeti belirtin veya *"menü"* yazarak ana menüye dönün.*`;

  await sendReply(message, otherServicesText);
  
  const sessionManager = require('./sessionManager');
  sessionManager.updateUserSession(message.from, {
    currentState: 'waiting_for_service_other'
  });
}

// ✅ GÜNCELLENDİ: Alt menü seçimini işle - KURUMSAL YAKLAŞIM
async function handleSubMenuSelection(message, number, categoryName, services) {
  try {
    const categoryData = services[categoryName];
    if (!categoryData || !categoryData.services) {
      await sendReply(message, '❌ Bu kategoriye ait hizmet bulunamadı.');
      await showMainMenu(message, services);
      return;
    }

    const serviceIndex = number - 1;
    const serviceList = Object.values(categoryData.services);
    
    if (serviceIndex >= 0 && serviceIndex < serviceList.length) {
      const selectedService = serviceList[serviceIndex];
      const serviceKey = Object.keys(categoryData.services)[serviceIndex];
      
      console.log(`✅ Alt menü seçildi: ${selectedService.name} (${serviceKey}) - Kategori: ${categoryName}`);
      
      // ✅ YEŞİL SİGORTA KONTROLÜ - FİYAT LİSTESİNE YÖNLENDİR
      if (serviceKey === 'yesil_sigorta' || selectedService.name.toLowerCase().includes('yeşil sigorta')) {
        console.log(`🔄 Yeşil Sigorta menü seçimi -> fiyat listesine yönlendiriliyor`);
        
        // Fiyat listesini göster
        if (services['fiyat_listeleri'] && services['fiyat_listeleri']['yesil_sigorta_fiyatlari']) {
          const priceService = services['fiyat_listeleri']['yesil_sigorta_fiyatlari'];
          await handleServiceSelection(message, priceService, 'fiyat_listeleri', 'yesil_sigorta_fiyatlari');
        } else {
          await sendReply(message, '❌ Yeşil Sigorta fiyat listesi şu an mevcut değil.');
          await showMainMenu(message, services);
        }
        return;
      }
      
      // Normal servis işleme
      await handleServiceSelection(message, selectedService, categoryName, serviceKey);
    } else {
      await sendReply(message, '❌ Geçersiz seçim. Lütfen menüdeki numaralardan birini girin.');
      await showCategoryOptions(message, categoryName, services);
    }
  } catch (error) {
    console.error(`Alt menü seçim hatası: ${error.message}`);
    await sendReply(message, '❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    await showMainMenu(message, services);
  }
}

// ✅ GÜNCELLENDİ: Servis seçimini işle - KURUMSAL YAKLAŞIM
async function handleServiceSelection(message, serviceData, category, serviceName) {
  try {
    console.log(`🚀 Servis seçimi: ${serviceName}, Kategori: ${category}`);
    
    const sessionManager = require('./sessionManager');
    
    // Timer'ları durdur
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    
    // ✅ YEŞİL SİGORTA KONTROLÜ - FİYAT LİSTESİNE YÖNLENDİR
    if (serviceName === 'yesil_sigorta') {
      console.log(`🔄 Yeşil Sigorta servisi -> fiyat listesine yönlendiriliyor`);
      
      const services = require('./serviceLoader').loadAllServices();
      if (services['fiyat_listeleri'] && services['fiyat_listeleri']['yesil_sigorta_fiyatlari']) {
        const priceService = services['fiyat_listeleri']['yesil_sigorta_fiyatlari'];
        await handleServiceSelection(message, priceService, 'fiyat_listeleri', 'yesil_sigorta_fiyatlari');
        return;
      }
    }
    
    // Normal servis işleme
    const serviceFlow = require('./serviceFlow');
    await serviceFlow.startServiceFlow(message, {
      type: 'service',
      data: serviceData,
      category: category,
      name: serviceName
    });
    
  } catch (error) {
    console.error(`Servis seçim hatası: ${error.message}`);
    await sendReply(message, '❌ Servis başlatılırken bir hata oluştu. Lütfen tekrar deneyin.');
    await showMainMenu(message, services);
  }
}

// ✅ GÜNCELLENDİ: Kategori seçeneklerini göster - KURUMSAL YAKLAŞIM
async function showCategoryOptions(message, category, services) {
  try {
    const sessionManager = require('./sessionManager');
    
    // Timer'ları sıfırla
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    
    // Kategori verilerini al
    const categoryData = services[category];
    if (!categoryData || !categoryData.services) {
      await sendReply(message, '❌ Bu kategoriye ait hizmet bulunamadı.');
      await showMainMenu(message, services);
      return;
    }
    
    const serviceList = Object.values(categoryData.services);
    let categoryText = `📁 *${categoryData.name || category}* - Hizmetler\n\n`;
    
    // Servisleri listeleyerek göster
    serviceList.forEach((service, index) => {
      categoryText += `${index + 1}️⃣ ${service.name}\n`;
    });
    
    categoryText += `\n💡 *İstediğiniz hizmet numarasını yazın*\n\n`;
    categoryText += `🔙 *"0"* yazarak ana menüye dönebilirsiniz.`;
    
    await sendReply(message, categoryText);
    
    // Oturum durumunu güncelle
    sessionManager.updateUserSession(message.from, {
      currentState: `submenu_${category}`,
      waitingForResponse: true
    });
    
    // Yeni timer başlat
    sessionManager.startMenuGoodbyeTimer(message.from, message);
    
    console.log(`📂 Kategori menüsü gösterildi: ${category} - Kullanıcı: ${message.from}`);
    
  } catch (error) {
    console.error(`Kategori menü hatası: ${error.message}`);
    await sendReply(message, '❌ Kategori yüklenirken bir hata oluştu.');
    await showMainMenu(message, services);
  }
}

// Servis anahtarını dönüştür
function convertToServiceKey(categoryName) {
  return serviceConverter.convertToServiceKey(categoryName);
}

// ✅ GÜNCELLENDİ: Ana menüye dön - KURUMSAL YAKLAŞIM
async function returnToMainMenu(message, services, contactName = '') {
  try {
    const sessionManager = require('./sessionManager');
    
    // Timer'ları temizle
    sessionManager.stopMenuGoodbyeTimer(message.from);
    sessionManager.stopHelpTimer(message.from);
    sessionManager.clearMessageBuffer(message.from);
    
    // Kurumsal mesaj gönder
    let welcomeText = `🏢 *PlanB Global Network Ltd*'ye hoş geldiniz`;
    if (contactName) {
      welcomeText += ` Sayın ${contactName}`;
    }
    welcomeText += `!\n\n`;
    
    welcomeText += `🛎️ *Size nasıl yardımcı olabilirim?*\n\n`;
    welcomeText += `📍 Ana menüye yönlendiriliyorsunuz...`;
    
    await sendReply(message, welcomeText);
    
    // Ana menüyü göster
    setTimeout(async () => {
      await showMainMenu(message, services);
    }, 1500);
    
  } catch (error) {
    console.error(`Ana menüye dönüş hatası: ${error.message}`);
    // Fallback
    await navigation.returnToMainMenu(message, services, contactName);
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
  
  // ✅ YENİ FONKSİYONLAR
  sendCorporateMainMenu,
  showOtherServices,
  
  // Alt modüllere erişim için
  mainMenu,
  subMenu,
  numberHandler,
  serviceConverter,
  categoryManager,
  navigation
};