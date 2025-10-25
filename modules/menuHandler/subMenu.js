// modules/menuHandler/subMenu.js
const logger = require('../logger');
const serviceConverter = require('./serviceConverter');

// Alt menü seçimini işleme
async function handleSubMenuSelection(message, number, categoryName, services) {
  console.log(`🎯 Alt menü seçimi: Kategori: ${categoryName}, Sayı: ${number}`);
  
  const categoryData = services[categoryName];
  
  if (!categoryData || !categoryData.category_options) {
    await message.reply('❌ Alt menü bulunamadı. Ana menüye dönülüyor.');
    const sessionManager = require('../sessionManager');
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    const mainMenu = require('./mainMenu');
    await mainMenu.showMainMenu(message, services);
    return;
  }

  const selectedOption = categoryData.category_options.find(opt => opt.option_number === number);
  
  if (selectedOption) {
    console.log(`✅ Alt menü seçildi: ${selectedOption.category_name}`);
    
    const serviceKey = serviceConverter.convertToServiceKey(selectedOption.category_name);
    
    // Servis anahtarını doğrula
    const validation = serviceConverter.validateServiceKey(serviceKey, services);
    
    if (validation.isValid) {
      const foundService = {
        type: 'service',
        data: validation.serviceData,
        category: validation.category,
        name: serviceKey
      };
      
      console.log(`✅ Servis bulundu: ${validation.category}/${serviceKey}`);
      const serviceFlow = require('../serviceFlow');
      await serviceFlow.startServiceFlow(message, foundService);
    } else {
      console.log(`❌ Servis bulunamadı: ${serviceKey}`);
      
      // Debug için tüm servisleri listele
      const allServices = serviceConverter.getAllServiceKeys();
      console.log('📋 Mevcut servisler:', allServices);
      
      // Hangi kategoride aradığını göster
      console.log(`🔍 Arama yapılan kategoriler:`, Object.keys(services).filter(key => 
        key.includes('sigorta') || key.includes('yazilim') || key.includes('lojistik')
      ));
      
      await message.reply(`✅ *${selectedOption.category_name}* seçildi!\n\n` +
                         `Bu hizmetle ilgili detaylı bilgi için en kısa sürede sizinle iletişime geçeceğiz.\n\n` +
                         `_Servis dosyası henüz hazırlanıyor, yakında aktif olacaktır._`);
      
      const sessionManager = require('../sessionManager');
      sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
      const mainMenu = require('./mainMenu');
      await mainMenu.showMainMenu(message, services);
    }
  } else {
    const validNumbers = categoryData.category_options.map(opt => opt.option_number);
    await message.reply(`❌ Geçersiz numara. Lütfen ${Math.min(...validNumbers)}-${Math.max(...validNumbers)} arası bir numara girin.`);
  }
}

// Kategori seçeneklerini göster
async function showCategoryOptions(message, category, services) {
  const categoryData = category.data;
  
  if (!categoryData) {
    await message.reply('❌ Kategori verileri bulunamadı. Ana menüye dönülüyor.');
    const sessionManager = require('../sessionManager');
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    const mainMenu = require('./mainMenu');
    await mainMenu.showMainMenu(message, services);
    return;
  }
  
  let optionsText = `🎯 *${categoryData.bot_greeting || category.name.replace(/_/g, ' ').toUpperCase()}*\n\n`;
  
  if (categoryData.category_options && categoryData.category_options.length > 0) {
    categoryData.category_options.forEach(option => {
      optionsText += `${option.option_number}. ${option.category_name}\n`;
    });
    
    optionsText += `\n${categoryData.completion_message || 'Lütfen bir numara seçin:'}`;
    
    await message.reply(optionsText);
  } else {
    await message.reply('❌ Bu kategoride henüz hizmet bulunmuyor. Ana menüye dönülüyor.');
    const sessionManager = require('../sessionManager');
    sessionManager.updateUserSession(message.from, { currentState: 'main_menu' });
    const mainMenu = require('./mainMenu');
    await mainMenu.showMainMenu(message, services);
  }
}

// Kategori seçeneklerini doğrula
function validateCategoryOptions(categoryData) {
  if (!categoryData || !categoryData.category_options) {
    return { isValid: false, error: 'Kategori seçenekleri bulunamadı' };
  }
  
  const validOptions = categoryData.category_options.filter(opt => 
    opt.option_number && opt.category_name && opt.category_name.trim().length > 0
  );
  
  if (validOptions.length === 0) {
    return { isValid: false, error: 'Geçerli kategori seçenekleri bulunamadı' };
  }
  
  // Sayıların sıralı olup olmadığını kontrol et
  const numbers = validOptions.map(opt => opt.option_number).sort((a, b) => a - b);
  const isSequential = numbers.every((num, index) => num === index + 1);
  
  if (!isSequential) {
    console.log('⚠️  Kategori numaraları sıralı değil:', numbers);
  }
  
  return { 
    isValid: true, 
    options: validOptions,
    count: validOptions.length,
    isSequential: isSequential
  };
}

// Kategori bilgilerini getir
function getCategoryInfo(categoryName, services) {
  const categoryData = services[categoryName];
  if (!categoryData) {
    return null;
  }
  
  const validation = validateCategoryOptions(categoryData);
  
  return {
    name: categoryName,
    displayName: categoryData.bot_greeting || categoryName.replace(/_/g, ' '),
    options: validation.isValid ? validation.options : [],
    optionCount: validation.isValid ? validation.count : 0,
    isValid: validation.isValid,
    error: validation.error,
    completionMessage: categoryData.completion_message || 'Lütfen bir numara seçin:'
  };
}

// Servis arama (debug için)
function searchServiceInAllCategories(serviceKey, services) {
  console.log(`🔍 Servis aranıyor: ${serviceKey}`);
  
  const foundIn = [];
  
  for (const [categoryName, categoryServices] of Object.entries(services)) {
    if (typeof categoryServices === 'object' && categoryServices[serviceKey]) {
      foundIn.push({
        category: categoryName,
        service: categoryServices[serviceKey]
      });
    }
  }
  
  if (foundIn.length > 0) {
    console.log(`✅ Servis bulundu:`, foundIn.map(f => f.category));
    return foundIn;
  } else {
    console.log(`❌ Servis hiçbir kategoride bulunamadı: ${serviceKey}`);
    
    // Benzer servisleri öner
    const similarServices = findSimilarServices(serviceKey, services);
    if (similarServices.length > 0) {
      console.log(`💡 Benzer servisler:`, similarServices);
    }
    
    return [];
  }
}

// Benzer servisleri bul
function findSimilarServices(serviceKey, services) {
  const similar = [];
  const searchTerm = serviceKey.toLowerCase();
  
  for (const [categoryName, categoryServices] of Object.entries(services)) {
    if (typeof categoryServices === 'object') {
      for (const [key, serviceData] of Object.entries(categoryServices)) {
        if (key.toLowerCase().includes(searchTerm) || 
            (serviceData.service_name && serviceData.service_name.toLowerCase().includes(searchTerm))) {
          similar.push({
            category: categoryName,
            key: key,
            name: serviceData.service_name || key
          });
        }
      }
    }
  }
  
  return similar;
}

module.exports = {
  handleSubMenuSelection,
  showCategoryOptions,
  validateCategoryOptions,
  getCategoryInfo,
  searchServiceInAllCategories,
  findSimilarServices
};