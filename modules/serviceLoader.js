const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// JSON verilerini yükleme fonksiyonu - GÜNCELLENDİ
function loadJSON(filePath) {
  try {
    // Önce verilen yolu dene
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsedData = JSON.parse(data);
      console.log(`✅ JSON yüklendi: ${filePath}`);
      return parsedData;
    }
    
    // GENEL_DİYALOG klasöründe de dene
    const genelDiyalogPath = path.join('./genel_diyalog', path.basename(filePath));
    if (fs.existsSync(genelDiyalogPath)) {
      const data = fs.readFileSync(genelDiyalogPath, 'utf8');
      const parsedData = JSON.parse(data);
      console.log(`✅ JSON yüklendi (genel_diyalog): ${genelDiyalogPath}`);
      return parsedData;
    }

    // Ana dizinde de dene
    const rootPath = path.join('./', path.basename(filePath));
    if (fs.existsSync(rootPath)) {
      const data = fs.readFileSync(rootPath, 'utf8');
      const parsedData = JSON.parse(data);
      console.log(`✅ JSON yüklendi (root): ${rootPath}`);
      return parsedData;
    }
    
    console.log(`❌ JSON dosyası bulunamadı: ${filePath}`);
    return null;
  } catch (error) {
    logger.error(`JSON yükleme hatası (${filePath}): ${error.message}`);
    console.log(`❌ JSON parse hatası: ${error.message}`);
    return null;
  }
}

// Tüm servisleri yükle - GÜNCELLENDİ
function loadAllServices() {
  const services = {};
  
  console.log('📁 Tüm servisler yükleniyor...');
  
  // Ana kategorileri yükle
  const anaKategoriDosyalari = fs.readdirSync('./ana_kategoriler').filter(file => file.endsWith('.json'));
  console.log(`📂 Ana kategoriler bulundu: ${anaKategoriDosyalari.length}`);
  
  anaKategoriDosyalari.forEach(file => {
    const key = file.replace('.json', '');
    services[key] = loadJSON(path.join('./ana_kategoriler', file));
  });
  
  // Data klasöründeki servisleri yükle
  if (fs.existsSync('./data')) {
    const dataKlasorleri = fs.readdirSync('./data').filter(name => 
      fs.statSync(path.join('./data', name)).isDirectory()
    );
    
    console.log(`📂 Data klasörleri: ${dataKlasorleri.length}`);
    
    dataKlasorleri.forEach(klasor => {
      const klasorYolu = path.join('./data', klasor);
      services[klasor] = {};
      
      const servisDosyalari = fs.readdirSync(klasorYolu).filter(file => file.endsWith('.json'));
      servisDosyalari.forEach(file => {
        const servisAdi = file.replace('.json', '');
        services[klasor][servisAdi] = loadJSON(path.join(klasorYolu, file));
      });
    });
  }
  
  // Fiyat listelerini yükle
  const fiyatKlasoru = './fiyat_listeleri';
  if (fs.existsSync(fiyatKlasoru)) {
    services['fiyat_listeleri'] = {};
    const fiyatDosyalari = fs.readdirSync(fiyatKlasoru).filter(file => file.endsWith('.json'));
    
    console.log(`💰 Fiyat dosyaları: ${fiyatDosyalari.length}`);
    
    fiyatDosyalari.forEach(file => {
      const fiyatAdi = file.replace('.json', '');
      services['fiyat_listeleri'][fiyatAdi] = loadJSON(path.join(fiyatKlasoru, file));
    });
  }
  
  // Genel diyalog dosyalarını yükle
  const genelDiyalogKlasoru = './genel_diyalog';
  if (fs.existsSync(genelDiyalogKlasoru)) {
    services['genel_diyalog'] = {};
    const diyalogDosyalari = fs.readdirSync(genelDiyalogKlasoru).filter(file => file.endsWith('.json'));
    
    console.log(`💬 Diyalog dosyaları: ${diyalogDosyalari.length}`);
    
    diyalogDosyalari.forEach(file => {
      const diyalogAdi = file.replace('.json', '');
      services['genel_diyalog'][diyalogAdi] = loadJSON(path.join(genelDiyalogKlasoru, file));
    });
  }
  
  console.log(`🎉 Toplam ${Object.keys(services).length} kategori yüklendi`);
  return services;
}

module.exports = {
  loadJSON,
  loadAllServices
};