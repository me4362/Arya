// modules/menuHandler/numberHandler.js - TAMAMEN GÜNCELLENDİ
const logger = require('../logger');
const sessionManager = require('../sessionManager');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendNumberMessage(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    console.error('Sayı mesajı gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(text);
  }
}

// Sayı seçimini işleme
async function handleNumberSelection(message, number, services) {
  const session = sessionManager.getUserSession(message.from);
  const currentState = session?.currentState || 'main_menu';

  console.log(`🔢 Sayı işleniyor: ${number}, Durum: ${currentState}`);

  // Alt menü durumu kontrolü
  if (currentState.startsWith('submenu_')) {
    const categoryName = currentState.replace('submenu_', '');
    const subMenu = require('./subMenu');
    await subMenu.handleSubMenuSelection(message, number, categoryName, services);
    return;
  }

  // Ana menü durumu
  const mainMenu = require('./mainMenu');
  const mainCategories = mainMenu.getMainCategories();

  // Sayı aralığını kontrol et
  if (number >= 1 && number <= mainCategories.length) {
    const selectedCategory = mainCategories[number - 1];
    const categoryData = services[selectedCategory];
    
    if (categoryData) {
      console.log(`✅ Kategori seçildi: ${selectedCategory}`);
      const subMenu = require('./subMenu');
      await subMenu.showCategoryOptions(message, { data: categoryData, name: selectedCategory }, services);
      sessionManager.updateUserSession(message.from, { currentState: `submenu_${selectedCategory}` });
    } else {
      console.log(`❌ Kategori verisi bulunamadı: ${selectedCategory}`);
      await sendNumberMessage(message, '❌ Bu kategori bulunamadı. Lütfen tekrar deneyin.');
      
      // Ana menüyü tekrar göster
      setTimeout(async () => {
        await mainMenu.showMainMenu(message, services);
      }, 1000);
    }
  } else {
    console.log(`❌ Geçersiz sayı aralığı: ${number}, Beklenen: 1-${mainCategories.length}`);
    await sendNumberMessage(message, `❌ Geçersiz numara. Lütfen 1-${mainCategories.length} arası bir numara girin.`);
    
    // Ana menüyü tekrar göster
    setTimeout(async () => {
      await mainMenu.showMainMenu(message, services);
    }, 1000);
  }
}

// Sayı doğrulama
function validateNumberInput(number, min, max) {
  console.log(`🔍 Sayı doğrulanıyor: ${number}, Min: ${min}, Max: ${max}`);
  
  // Sayısal değilse
  if (isNaN(number)) {
    return { 
      isValid: false, 
      error: 'Geçersiz sayı formatı. Lütfen sadece rakam girin.' 
    };
  }
  
  const parsedNumber = parseInt(number);
  
  // Aralık kontrolü
  if (parsedNumber < min || parsedNumber > max) {
    return { 
      isValid: false, 
      error: `Lütfen ${min}-${max} arası bir numara girin` 
    };
  }
  
  return { 
    isValid: true, 
    number: parsedNumber 
  };
}

// Menü numaralarını formatla
function formatMenuNumbers(options, startFrom = 1) {
  console.log(`📝 Menü numaraları formatlanıyor: ${options.length} seçenek, Başlangıç: ${startFrom}`);
  
  const formattedOptions = options.map((option, index) => {
    // Eğer option_number zaten varsa, onu kullan
    if (option.option_number) {
      return option;
    }
    
    // Yoksa yeni numara ata
    return {
      ...option,
      option_number: startFrom + index
    };
  });
  
  console.log(`✅ ${formattedOptions.length} seçenek formatlandı`);
  return formattedOptions;
}

// Geçerli sayı aralığını getir
function getValidNumberRange(session, services) {
  const currentState = session?.currentState || 'main_menu';
  
  if (currentState.startsWith('submenu_')) {
    const categoryName = currentState.replace('submenu_', '');
    const categoryData = services[categoryName];
    
    if (categoryData && categoryData.category_options) {
      const numbers = categoryData.category_options.map(opt => opt.option_number);
      return {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        count: numbers.length,
        type: 'submenu'
      };
    }
  } else {
    // Ana menü
    const mainMenu = require('./mainMenu');
    const mainCategories = mainMenu.getMainCategories();
    return {
      min: 1,
      max: mainCategories.length,
      count: mainCategories.length,
      type: 'main_menu'
    };
  }
  
  return {
    min: 1,
    max: 1,
    count: 0,
    type: 'unknown'
  };
}

// Hata mesajı gönder
async function sendErrorMessage(message, session, services) {
  const range = getValidNumberRange(session, services);
  
  let errorMessage = '';
  
  switch (range.type) {
    case 'main_menu':
      errorMessage = `❌ Geçersiz numara. Lütfen 1-${range.max} arası bir numara girin.`;
      break;
    case 'submenu':
      errorMessage = `❌ Geçersiz numara. Lütfen ${range.min}-${range.max} arası bir numara girin.`;
      break;
    default:
      errorMessage = '❌ Geçersiz seçim. Lütfen menüden bir numara seçin.';
  }
  
  await sendNumberMessage(message, errorMessage);
  
  // Duruma göre uygun menüyü tekrar göster
  setTimeout(async () => {
    if (range.type === 'main_menu') {
      const mainMenu = require('./mainMenu');
      await mainMenu.showMainMenu(message, services);
    } else if (range.type === 'submenu') {
      const categoryName = session.currentState.replace('submenu_', '');
      const categoryData = services[categoryName];
      if (categoryData) {
        const subMenu = require('./subMenu');
        await subMenu.showCategoryOptions(message, { data: categoryData, name: categoryName }, services);
      }
    }
  }, 1000);
}

// Sayı girişini işle (ana fonksiyon)
async function processNumberInput(message, input, services) {
  const session = sessionManager.getUserSession(message.from);
  const range = getValidNumberRange(session, services);
  
  console.log(`🔢 Sayı işleniyor: "${input}", Durum: ${session?.currentState}, Beklenen aralık: ${range.min}-${range.max}`);
  
  // Sayıyı doğrula
  const validation = validateNumberInput(input, range.min, range.max);
  
  if (!validation.isValid) {
    console.log(`❌ Sayı doğrulama başarısız: ${validation.error}`);
    await sendNumberMessage(message, `❌ ${validation.error}`);
    return false;
  }
  
  const number = validation.number;
  console.log(`✅ Sayı doğrulandı: ${number}`);
  
  // Sayıyı işle
  await handleNumberSelection(message, number, services);
  return true;
}

// Debug bilgilerini logla
function logNumberProcessing(session, number, services) {
  const range = getValidNumberRange(session, services);
  
  console.log('🔍 SAYI İŞLEME DEBUG:');
  console.log(`- Mevcut durum: ${session?.currentState || 'main_menu'}`);
  console.log(`- Girilen sayı: ${number}`);
  console.log(`- Beklenen aralık: ${range.min}-${range.max}`);
  console.log(`- Menü tipi: ${range.type}`);
  console.log(`- Seçenek sayısı: ${range.count}`);
  
  if (range.type === 'submenu') {
    const categoryName = session.currentState.replace('submenu_', '');
    const categoryData = services[categoryName];
    if (categoryData && categoryData.category_options) {
      console.log(`- Mevcut seçenekler:`, categoryData.category_options.map(opt => ({
        num: opt.option_number,
        name: opt.category_name
      })));
    }
  }
}

module.exports = {
  handleNumberSelection,
  validateNumberInput,
  formatMenuNumbers,
  getValidNumberRange,
  sendErrorMessage,
  processNumberInput,
  logNumberProcessing
};