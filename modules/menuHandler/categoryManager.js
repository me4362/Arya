// modules/menuHandler/categoryManager.js
const logger = require('../logger');

// Kategori verilerini yükle
function loadCategoryData(categoryName, services) {
  console.log(`📁 Kategori yükleniyor: ${categoryName}`);
  
  // Önce ana kategorilerde ara
  if (services[categoryName]) {
    return services[categoryName];
  }
  
  // Alternatif isimlerle dene
  const alternativeNames = getAlternativeCategoryNames(categoryName);
  for (const altName of alternativeNames) {
    if (services[altName]) {
      console.log(`🔄 Alternatif kategori bulundu: ${altName}`);
      return services[altName];
    }
  }
  
  console.log(`❌ Kategori bulunamadı: ${categoryName}`);
  return null;
}

// Alternatif kategori isimlerini getir
function getAlternativeCategoryNames(categoryName) {
  const alternatives = [];
  
  // "_ana" ekle/çıkar
  if (categoryName.includes('_ana')) {
    alternatives.push(categoryName.replace('_ana', ''));
  } else {
    alternatives.push(categoryName + '_ana');
  }
  
  // "_kategori" ekle/çıkar
  if (categoryName.includes('_kategori')) {
    alternatives.push(categoryName.replace('_kategori', ''));
  } else {
    alternatives.push(categoryName + '_kategori');
  }
  
  // "_hizmetleri" ekle/çıkar
  if (categoryName.includes('_hizmetleri')) {
    alternatives.push(categoryName.replace('_hizmetleri', ''));
  } else {
    alternatives.push(categoryName + '_hizmetleri');
  }
  
  return alternatives.filter((value, index, self) => self.indexOf(value) === index);
}

// Kategori seçeneklerini doğrula
function validateCategoryOptions(categoryData) {
  if (!categoryData || !categoryData.category_options) {
    return { isValid: false, error: 'Kategori seçenekleri bulunamadı' };
  }
  
  const options = categoryData.category_options;
  const validOptions = options.filter(opt => 
    opt.option_number && opt.category_name && opt.category_name.trim().length > 0
  );
  
  if (validOptions.length === 0) {
    return { isValid: false, error: 'Geçerli kategori seçenekleri bulunamadı' };
  }
  
  return { 
    isValid: true, 
    options: validOptions,
    count: validOptions.length 
  };
}

// Kategori bilgilerini getir
function getCategoryInfo(categoryName, services) {
  const categoryData = loadCategoryData(categoryName, services);
  if (!categoryData) {
    return null;
  }
  
  return {
    name: categoryName,
    displayName: categoryData.bot_greeting || categoryName.replace(/_/g, ' '),
    options: categoryData.category_options || [],
    completionMessage: categoryData.completion_message || 'Lütfen bir numara seçin:'
  };
}

module.exports = {
  loadCategoryData,
  getAlternativeCategoryNames,
  validateCategoryOptions,
  getCategoryInfo
};