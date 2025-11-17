// modules/menuHandler.js - ANA YÖNLENDİRİCİ DOSYA + 6 DAKİKA TIMER EKLENDİ
const mainMenu = require('./menuHandler/mainMenu');
const subMenu = require('./menuHandler/subMenu');
const numberHandler = require('./menuHandler/numberHandler');
const serviceConverter = require('./menuHandler/serviceConverter');
const categoryManager = require('./menuHandler/categoryManager');
const navigation = require('./menuHandler/navigation');
const sessionManager = require('./sessionManager'); // <-- artık stopMenuGoodbyeTimer içeriyor

// Ana menü göster - GÜNCELLENDİ (stopMenuGoodbyeTimer ÇAĞRISI KALDIRILMADI, SADECE FONKSİYON VAR)
async function showMainMenu(message, services) {
  try {
    // 1) Önceki timer'ı durdur
    sessionManager.stopMenuGoodbyeTimer(message.from);

    // 2) Menüyü göster
    await mainMenu.showMainMenu(message, services);

    // 3) 6 dk. timer'ı yeniden başlat
    sessionManager.startMenuGoodbyeTimer(message.from, message, services);

    console.log(`📋 Menü gösterildi - 6 dakika timer başlatıldı: ${message.from}`);
  } catch (error) {
    console.error('Menü gösterim hatası:', error);
    // Fallback: sadece menüyü dene
    await mainMenu.showMainMenu(message, services);
  }
}

// Sayı seçimini işle
async function handleNumberSelection(message, number, services) {
  await numberHandler.handleNumberSelection(message, number, services);
}

// Alt menü seçimini işle - YEŞİL SİGORTA YÖNLENDİRMESİ KORUNMUŞ
async function handleSubMenuSelection(message, number, categoryName, services) {
  const categoryData = services[categoryName];
  if (!categoryData || !categoryData.services) {
    await sendReply(message, '❌ Bu kategoriye ait hizmet bulunamadı.');
    return;
  }

  const serviceIndex = number - 1;
  const serviceList = Object.values(categoryData.services);

  if (serviceIndex >= 0 && serviceIndex < serviceList.length) {
    const selectedService = serviceList[serviceIndex];
    const serviceKey = Object.keys(categoryData.services)[serviceIndex];

    console.log(`✅ Alt menü seçildi: ${selectedService.name} (${serviceKey})`);

    // YEŞİL SİGORTA kontrolü korunmuş
    if (serviceKey === 'yesil_sigorta' || selectedService.name.toLowerCase().includes('yeşil sigorta')) {
      console.log(`🔄 Yeşil Sigorta menü seçimi -> fiyat listesine yönlendiriliyor`);
      if (services['fiyat_listeleri'] && services['fiyat_listeleri']['yesil_sigorta_fiyatlari']) {
        const priceService = services['fiyat_listeleri']['yesil_sigorta_fiyatlari'];
        await handleServiceSelection(message, priceService, 'fiyat_listeleri', 'yesil_sigorta_fiyatlari');
      } else {
        await sendReply(message, '❌ Yeşil Sigorta fiyat listesi şu an mevcut değil.');
      }
      return;
    }
    await handleServiceSelection(message, selectedService, categoryName, serviceKey);
  } else {
    await sendReply(message, '❌ Geçersiz seçim. Lütfen menüdeki numaralardan birini girin.');
  }
}

// Servis seçimini işle - YEŞİL SİGORTA KONTROLÜ KORUNMUŞ
async function handleServiceSelection(message, serviceData, category, serviceName) {
  console.log(`🚀 Servis seçimi: ${serviceName}, Kategori: ${category}`);

  if (serviceName === 'yesil_sigorta') {
    console.log(`🔄 Yeşil Sigorta servisi -> fiyat listesine yönlendiriliyor`);
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
}

// Kategori seçeneklerini göster
async function showCategoryOptions(message, category, services) {
  await subMenu.showCategoryOptions(message, category, services);
}

// Anahtar dönüştürücü
function convertToServiceKey(categoryName) {
  return serviceConverter.convertToServiceKey(categoryName);
}

// Ana menüye dön
async function returnToMainMenu(message, services, contactName = '') {
  await navigation.returnToMainMenu(message, services, contactName);
}

// Hızlı mesaj gönderme
async function sendReply(message, text) {
  const { sendMessageWithoutQuote } = require('./utils/globalClient');
  try { await sendMessageWithoutQuote(message.from, text); }
  catch { await message.reply(text); }
}

module.exports = {
  showMainMenu,
  handleNumberSelection,
  handleSubMenuSelection,
  handleServiceSelection,
  showCategoryOptions,
  convertToServiceKey,
  returnToMainMenu,
  // Alt modül erişimi
  mainMenu,
  subMenu,
  numberHandler,
  serviceConverter,
  categoryManager,
  navigation
};
