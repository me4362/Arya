// modules/menuHandler/serviceConverter.js
const logger = require('../logger');

// Servis anahtarını dönüştürme - DÜZELTİLDİ
function convertToServiceKey(categoryName) {
  const conversions = {
    // === SİGORTA HİZMETLERİ ===
    'Yeşil Sigorta': 'yesil_sigorta', // yesil_sigortasi → yesil_sigorta
    'Trafik Sigortası': 'trafik_sigortasi',
    'KASKO': 'kasko',
    'Koltuk Sigortası': 'koltuk_sigortasi',
    'DASK': 'dask',
    'Konut Sigortası': 'konut_sigortasi',
    'İşyeri Sigortası': 'isyeri_sigortasi',
    'Seyahat Sağlık Sigortası': 'seyahat_saglik_sigortasi',
    'Tamamlayıcı Sağlık Sigortası': 'tamamlayici_saglik_sigortasi',
    'Özel Sağlık Sigortası': 'ozel_saglik_sigortasi',

    // === YAZILIM TALEPLERİ ===
    'Özel Yazılım Geliştirme': 'ozel_yazilim_gelistirme',
    'Mobil Uygulama Geliştirme': 'mobil_uygulama_gelistirme',

    // === SİBER GÜVENLİK ===
    'Genel Ağ Güvenliği': 'genel_ag_guvenligi',
    'Kullanıcı Güvenliği': 'kullanici_guvenligi',
    'Veri Güvenliği': 'veri_guvenligi',
    'Uygulama Güvenliği': 'uygulama_guvenligi',
    'Kimlik ve Erişim Yönetimi': 'kimlik_erisim_yonetimi',
    'Güvenlik Yönetimi': 'guvenlik_yonetimi',
    'Penetrasyon Test Talebi': 'penetrasyon_test_talebi',
    'Eğitim Talepleri': 'egitim_talepleri',

    // === LOJİSTİK HİZMETLERİ ===
    'Yurtiçi Yük Nakli': 'yurtici_yuk_nakli',
    'Yurtdışı Yük Nakli': 'yurtdisi_yuk_nakli',
    'Depo/Antrepo Hizmeti': 'depo_antrepo_hizmeti',

    // === İTHALAT İHRACAT ===
    'Yurtdışı Müşteri Araştırma': 'yurtdisi_musteri_arastirma',
    'Yurtiçi Tedarikçi Araştırma': 'yurtici_tedarikci_arastirma',
    'Gümrük Operasyon Hizmetleri': 'gumruk_operasyon_hizmetleri',
    'Yurtiçi Ürün Araştırma': 'yurtici_urun_arastirma',
    'Yurtdışı Pazar Araştırma': 'yurtdisi_pazar_arastirma',

    // === PROFESYONEL DENETLEME ===
    'İç Denetim Hizmeti': 'ic_denetim_hizmeti',
    'Tedarikçi Müşteri Mali Denetim': 'tedarikci_musteri_mali_denetim',
    'Tedarikçi Kalite Denetim': 'tedarikci_kalite_denetim',
    'Tedarikçi Üretim Denetleme': 'tedarikci_uretim_denetleme',
    'Firma Temsil Hizmeti': 'firma_temsil_hizmeti',

    // === İNŞAAT EMLAK ===
    'Satılık Gayrimenkul': 'satilik_gayrimenkul',
    'Kiralık Gayrimenkul': 'kiralik_gayrimenkul',
    'Yurtdışı Gayrimenkul Yatırım': 'yurtdisi_gayrimenkul_yatirim',
    'İnşaat Taahhüt Hizmeti': 'insaat_taahhut_hizmeti',

    // === CRM HİZMETLERİ ===
    'Müşteri Seçimi': 'musteri_secimi',
    'Müşteri Edinme': 'musteri_edinme',
    'Müşteri Koruma': 'musteri_koruma',
    'Müşteri Derinleştirme': 'musteri_derinlestirme',

    // === TEKSTİL ÜRÜNLERİ ===
    'Erkek Giyim': 'erkek_giyim',
    'Kadın Giyim': 'kadin_giyim',
    'Ev Tekstil Ürünleri': 'ev_tekstil_urunleri',

    // === KOZMETİK ÜRÜNLERİ ===
    'Parfüm': 'parfum',
    'Deodorant': 'deodorant',
    'Kişisel Bakım': 'kisisel_bakim',
    'Medikal Kozmetik': 'medikal_kozmetik',

    // === TUR ORGANİZASYON ===
    'Yurtiçi Özel Gezi Talebi': 'yurtici_ozel_gezi_talebi',
    'Yurtdışı Özel Gezi Talebi': 'yurtdisi_ozel_gezi_talebi',
    'Personel Servis Talebi': 'personel_servis_talebi',

    // === GÜNEŞ ENERJİSİ SİSTEMLERİ ===
    'Güneş Verimlilik Hesabı': 'gunes_verimlilik_hesabi',
    'GES Üretim Hesaplama': 'ges_uretim_hesaplama',
    'GES Kurulum Hesaplama': 'ges_kurulum_hesaplama',

    // === KURUMSAL HİZMETLER ===
    'İnsan Kaynakları Danışmanlığı': 'insan_kaynaklari_danismanligi',
    'Stratejik Planlama Danışmanlığı': 'stratejik_planlama_danismanligi',
    'Finansal Danışmanlık': 'finansal_danismanlik',
    'Operasyonel İyileştirme': 'operasyonel_iyilestirme',
    'Kurumsal İletişim Danışmanlığı': 'kurumsal_iletisim_danismanligi',
    'Yasal Danışmanlık': 'yasal_danismanlik',
    'Teknoloji Danışmanlığı': 'teknoloji_danismanlik',
    'Kurumsal Eğitim Hizmetleri': 'kurumsal_egitim_hizmetleri'
  };

  const serviceKey = conversions[categoryName];
  
  if (serviceKey) {
    console.log(`🔄 Servis dönüşümü: "${categoryName}" -> "${serviceKey}"`);
    return serviceKey;
  } else {
    // Fallback: otomatik dönüşüm
    const autoConverted = categoryName.toLowerCase()
      .replace(/ /g, '_')
      .replace(/[ıİ]/g, 'i')
      .replace(/[şŞ]/g, 's')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[çÇ]/g, 'c')
      .replace(/[öÖ]/g, 'o');
    
    console.log(`⚠️  Servis bulunamadı, otomatik dönüşüm: "${categoryName}" -> "${autoConverted}"`);
    return autoConverted;
  }
}

// Tüm mevcut servis anahtarlarını listele - DÜZELTİLDİ
function getAllServiceKeys() {
  return {
    sigorta: [
      'yesil_sigorta', // yesil_sigortasi → yesil_sigorta
      'trafik_sigortasi',
      'kasko',
      'koltuk_sigortasi',
      'dask',
      'konut_sigortasi',
      'isyeri_sigortasi',
      'seyahat_saglik_sigortasi',
      'tamamlayici_saglik_sigortasi',
      'ozel_saglik_sigortasi'
    ],
    // ... diğer kategoriler aynı kalacak
    yazilim: [
      'ozel_yazilim_gelistirme', 'mobil_uygulama_gelistirme'
    ],
    siber_guvenlik: [
      'genel_ag_guvenligi',
      'kullanici_guvenligi',
      'veri_guvenligi',
      'uygulama_guvenligi',
      'kimlik_erisim_yonetimi',
      'guvenlik_yonetimi',
      'penetrasyon_test_talebi',
      'egitim_talepleri'
    ],
    lojistik: [
      'yurtici_yuk_nakli', 'yurtdisi_yuk_nakli', 'depo_antrepo_hizmeti'
    ],
    ithalat_ihracat: [
      'yurtdisi_musteri_arastirma',
      'yurtici_tedarikci_arastirma',
      'gumruk_operasyon_hizmetleri',
      'yurtici_urun_arastirma',
      'yurtdisi_pazar_arastirma'
    ],
    profesyonel_denetleme: [
      'ic_denetim_hizmeti',
      'tedarikci_musteri_mali_denetim',
      'tedarikci_kalite_denetim',
      'tedarikci_uretim_denetleme',
      'firma_temsil_hizmeti'
    ],
    insaat_emlak: [
      'satilik_gayrimenkul',
      'kiralik_gayrimenkul',
      'yurtdisi_gayrimenkul_yatirim',
      'insaat_taahhut_hizmeti'
    ],
    crm: [
      'musteri_secimi',
      'musteri_edinme',
      'musteri_koruma',
      'musteri_derinlestirme'
    ],
    tekstil: [ 'erkek_giyim', 'kadin_giyim', 'ev_tekstil_urunleri' ],
    kozmetik: [ 'parfum', 'deodorant', 'kisisel_bakim', 'medikal_kozmetik' ],
    tur: [
      'yurtici_ozel_gezi_talebi',
      'yurtdisi_ozel_gezi_talebi',
      'personel_servis_talebi'
    ],
    gunes_enerjisi: [
      'gunes_verimlilik_hesabi',
      'ges_uretim_hesaplama',
      'ges_kurulum_hesaplama'
    ],
    kurumsal: [
      'insan_kaynaklari_danismanligi',
      'stratejik_planlama_danismanligi',
      'finansal_danismanlik',
      'operasyonel_iyilestirme',
      'kurumsal_iletisim_danismanligi',
      'yasal_danismanlik',
      'teknoloji_danismanlik',
      'kurumsal_egitim_hizmetleri'
    ]
  };
}

// Servis anahtarını doğrula
function validateServiceKey(serviceKey, services) {
  for (const [category, categoryServices] of Object.entries(services)) {
    if (typeof categoryServices === 'object' && categoryServices[serviceKey]) {
      return {
        isValid: true,
        category: category,
        serviceData: categoryServices[serviceKey]
      };
    }
  }
  
  return {
    isValid: false,
    error: `Servis bulunamadı: ${serviceKey}`
  };
}

module.exports = {
  convertToServiceKey,
  getAllServiceKeys,
  validateServiceKey
};