// modules/saleFlow/serviceFinder.js
const logger = require('../logger');

// Yeşil Sigorta servisini bul - DÜZELTİLDİ
function findYesilSigortaService(services) {
  console.log(`🔍 Yeşil Sigorta servisi aranıyor...`);
  
  for (const [categoryName, categoryServices] of Object.entries(services)) {
    if (typeof categoryServices === 'object' && categoryServices['yesil_sigorta']) { // yesil_sigortasi → yesil_sigorta
      console.log(`✅ Yeşil Sigorta bulundu: ${categoryName}/yesil_sigorta`);
      return {
        type: 'service',
        data: categoryServices['yesil_sigorta'],
        category: categoryName,
        name: 'yesil_sigorta'
      };
    }
  }
  
  console.log(`❌ Yeşil Sigorta servisi bulunamadı`);
  
  // Alternatif servisleri kontrol et
  const alternativeServices = findAlternativeServices(services);
  if (alternativeServices.length > 0) {
    console.log(`💡 Alternatif servisler bulundu:`, alternativeServices);
  }
  
  return null;
}

// Alternatif servisleri bul
function findAlternativeServices(services) {
  const alternatives = [];
  const targetServices = ['yesil_sigorta', 'trafik_sigortasi', 'kasko']; // yesil_sigortasi → yesil_sigorta
  
  for (const serviceKey of targetServices) {
    for (const [categoryName, categoryServices] of Object.entries(services)) {
      if (typeof categoryServices === 'object' && categoryServices[serviceKey]) {
        alternatives.push({
          name: serviceKey,
          category: categoryName,
          displayName: categoryServices[serviceKey].service_name || serviceKey
        });
      }
    }
  }
  
  return alternatives;
}

// Tüm sigorta servislerini listele
function getAllInsuranceServices(services) {
  const insuranceServices = [];
  
  // Sigorta kategorilerinde ara
  const insuranceCategories = ['sigorta_hizmetleri', 'sigorta_ana_kategori'];
  
  for (const category of insuranceCategories) {
    if (services[category]) {
      for (const [serviceKey, serviceData] of Object.entries(services[category])) {
        if (typeof serviceData === 'object' && serviceData.service_name) {
          insuranceServices.push({
            key: serviceKey,
            name: serviceData.service_name,
            category: category
          });
        }
      }
    }
  }
  
  return insuranceServices;
}

// Servis öncelik sıralaması - DÜZELTİLDİ
function getServicePriority(serviceName) {
  const priorityMap = {
    'yesil_sigorta': 1, // yesil_sigortasi → yesil_sigorta
    'trafik_sigortasi': 2,
    'kasko': 3,
    'konut_sigortasi': 4,
    'dask': 5
  };
  
  return priorityMap[serviceName] || 999;
}

module.exports = {
  findYesilSigortaService,
  findAlternativeServices,
  getAllInsuranceServices,
  getServicePriority
};