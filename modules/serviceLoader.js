const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// JSON verilerini yükleme fonksiyonu - OPTİMİZE EDİLDİ
function loadJSON(filePath) {
  try {
    // Önce verilen yolu dene
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(data);
      return parsedData;
    }
    
    // GENEL_DİYALOG klasöründe de dene
    const genelDiyalogPath = path.join('./genel_diyalog', path.basename(filePath));
    if (fs.existsSync(genelDiyalogPath)) {
      const data = fs.readFileSync(genelDiyalogPath, 'utf8');
      const parsedData = JSON.parse(data);
      return parsedData;
    }

    // Ana dizinde de dene
    const rootPath = path.join('./', path.basename(filePath));
    if (fs.existsSync(rootPath)) {
      const data = fs.readFileSync(rootPath, 'utf8');
      const parsedData = JSON.parse(data);
      return parsedData;
    }
    
    console.log(`❌ JSON dosyası bulunamadı: ${filePath}`);
    return null;
  } catch (error) {
    logger.error(`JSON yükleme hatası (${filePath}): ${error.message}`);
    return null;
  }
}

// Tüm servisleri yükle - OPTİMİZE EDİLDİ (KISALTILMIŞ LOG)
function loadAllServices() {
  const services = {};
  let totalFileCount = 0;
  
  console.log('📁 Servisler yükleniyor...');
  
  // Ana kategorileri yükle - KISALTILMIŞ
  const anaKategoriDosyalari = fs.readdirSync('./ana_kategoriler').filter(file => file.endsWith('.json'));
  anaKategoriDosyalari.forEach(file => {
    const key = file.replace('.json', '');
    services[key] = loadJSON(path.join('./ana_kategoriler', file));
  });
  totalFileCount += anaKategoriDosyalari.length;
  
  // Data klasöründeki servisleri yükle - KISALTILMIŞ
  if (fs.existsSync('./data')) {
    const dataKlasorleri = fs.readdirSync('./data').filter(name => 
      fs.statSync(path.join('./data', name)).isDirectory()
    );
    
    dataKlasorleri.forEach(klasor => {
      const klasorYolu = path.join('./data', klasor);
      services[klasor] = {};
      
      const servisDosyalari = fs.readdirSync(klasorYolu).filter(file => file.endsWith('.json'));
      servisDosyalari.forEach(file => {
        const servisAdi = file.replace('.json', '');
        services[klasor][servisAdi] = loadJSON(path.join(klasorYolu, file));
      });
      totalFileCount += servisDosyalari.length;
    });
  }
  
  // Fiyat listelerini yükle - KISALTILMIŞ
  const fiyatKlasoru = './fiyat_listeleri';
  if (fs.existsSync(fiyatKlasoru)) {
    services['fiyat_listeleri'] = {};
    const fiyatDosyalari = fs.readdirSync(fiyatKlasoru).filter(file => file.endsWith('.json'));
    
    fiyatDosyalari.forEach(file => {
      const fiyatAdi = file.replace('.json', '');
      services['fiyat_listeleri'][fiyatAdi] = loadJSON(path.join(fiyatKlasoru, file));
    });
    totalFileCount += fiyatDosyalari.length;
  }
  
  // Genel diyalog dosyalarını yükle - KISALTILMIŞ
  const genelDiyalogKlasoru = './genel_diyalog';
  if (fs.existsSync(genelDiyalogKlasoru)) {
    services['genel_diyalog'] = {};
    const diyalogDosyalari = fs.readdirSync(genelDiyalogKlasoru).filter(file => file.endsWith('.json'));
    
    diyalogDosyalari.forEach(file => {
      const diyalogAdi = file.replace('.json', '');
      services['genel_diyalog'][diyalogAdi] = loadJSON(path.join(genelDiyalogKlasoru, file));
    });
    totalFileCount += diyalogDosyalari.length;
  }
  
  // TEK SATIR ÖZET
  console.log(`✅ ${totalFileCount} servis dosyası yüklendi (${Object.keys(services).length} kategori)`);
  
  return services;
}

module.exports = {
  loadJSON,
  loadAllServices
};
