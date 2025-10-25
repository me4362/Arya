// modules/menuHandler/mainMenu.js - GÜNCELLENDİ
const logger = require('../logger');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Ana menü göster - GÜNCELLENDİ
async function showMainMenu(message, services) {
  let menuText = `📋 *ANA HİZMET KATEGORİLERİ*\n\n`;
  
  const mainCategories = [
    '🛡️  Sigorta Hizmetleri',
    '💻 Yazılım Talepleri', 
    '🔒 Siber Güvenlik',
    '🚚 Lojistik Hizmetleri',
    '🌍 İthalat İhracat',
    '📊 Profesyonel Denetleme',
    '🏠 İnşaat Emlak',
    '🤝 CRM Hizmetleri',
    '👕 Tekstil Ürünleri',
    '💄 Kozmetik Ürünleri',
    '✈️  Tur Organizasyon',
    '☀️  Güneş Enerjisi',
    '🏢 Kurumsal Hizmetler'
  ];
  
  mainCategories.forEach((category, index) => {
    menuText += `${index + 1}. ${category}\n`;
  });
  
  menuText += `\nİlgilendiğiniz hizmetin *numarasını* yazın veya *doğrudan hizmet adını* belirtin.`;
  
  try {
    await sendMessageWithoutQuote(message.from, menuText);
  } catch (error) {
    console.error('Menü gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(menuText);
  }
  
  // Menü gösterildikten sonra timer başlat
  const sessionManager = require('../sessionManager');
  sessionManager.startMenuTimer(message.from, message, services);
}

// Ana menü kategorilerini getir
function getMainCategories() {
  return [
    'sigorta_ana_kategori',
    'yazilim_talepleri_ana_kategori', 
    'siber_guvenlik_ana',
    'lojistik_hizmetleri_ana',
    'ithalat_ihracat_ana',
    'profesyonel_denetleme_ana',
    'insaat_emlak_ana',
    'crm_hizmetleri_ana',
    'tekstil_urunleri_ana',
    'kozmetik_urunleri_ana',
    'tur_organizasyon_ana',
    'gunes_enerjisi_sistemleri_ana',
    'kurumsal_hizmetler_ana'
  ];
}

module.exports = {
  showMainMenu,
  getMainCategories
};