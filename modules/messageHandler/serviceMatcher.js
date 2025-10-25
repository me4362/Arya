// modules/messageHandler/serviceMatcher.js - TAMAMEN GÜNCELLENDİ
const logger = require('../logger');
const serviceLoader = require('../serviceLoader');

function findMatchingService(message, services) {
  const cleanMessage = message.toLowerCase().replace(/[.,!?]/g, '').trim();
  
  console.log(`🔍 Servis aranıyor: "${cleanMessage}"`);

  // ÖNCE: KİMLİK VE TANITIM SORULARI
  const kimlikSorulari = {
    'sen kimsin': 'kimlik_tanitim',
    'sen kimsiniz': 'kimlik_tanitim',
    'siz kimsiniz': 'kimlik_tanitim',
    'ne yapıyorsun': 'kimlik_tanitim',
    'ne yapiyorsun': 'kimlik_tanitim',
    'ne yapıyorsunuz': 'kimlik_tanitim',
    'ne yapiyorsunuz': 'kimlik_tanitim',
    'gerçek insan mısın': 'kimlik_tanitim',
    'gercek insan misin': 'kimlik_tanitim',
    'insan mısın': 'kimlik_tanitim',
    'insan misin': 'kimlik_tanitim',
    'robot musun': 'kimlik_tanitim',
    'yapay zeka mısın': 'kimlik_tanitim',
    'yapay zeka misin': 'kimlik_tanitim',
    'ai mısın': 'kimlik_tanitim',
    'ai misin': 'kimlik_tanitim'
  };

  // SONRA: İLETİŞİM VE DESTEK SORULARI
  const iletisimSorulari = {
    'insan ile görüş': 'iletisim_destek',
    'insan ile gorus': 'iletisim_destek',
    'telefon numarası': 'iletisim_destek',
    'telefon numarasi': 'iletisim_destek',
    'numara ver': 'iletisim_destek',
    'web sitesi': 'iletisim_destek',
    'web adresi': 'iletisim_destek',
    'iletişim': 'iletisim_destek',
    'iletisim': 'iletisim_destek',
    'müşteri hizmetleri': 'iletisim_destek',
    'musteri hizmetleri': 'iletisim_destek',
    'destek': 'iletisim_destek',
    'canlı destek': 'iletisim_destek',
    'canli destek': 'iletisim_destek'
  };

  // FİRMA BİLGİSİ SORULARI
  const firmaSorulari = {
    'firma bilgisi': 'firma_bilgileri',
    'şirket bilgisi': 'firma_bilgileri',
    'sirket bilgisi': 'firma_bilgileri',
    'hangi hizmetler': 'firma_bilgileri',
    'hizmet alanları': 'firma_bilgileri',
    'hizmet alanlari': 'firma_bilgileri',
    'neler yapıyorsunuz': 'firma_bilgileri',
    'neler yapiyorsunuz': 'firma_bilgileri',
    'hangi sektörler': 'firma_bilgileri',
    'hangi sektorler': 'firma_bilgileri'
  };

  // 1. ÖNCE KİMLİK SORULARINI KONTROL ET
  for (const [soru, dosya] of Object.entries(kimlikSorulari)) {
    if (cleanMessage.includes(soru)) {
      console.log(`🎯 Kimlik sorusu eşleşti: "${soru}" -> ${dosya}`);
      return createDiyalogCevabi(soru, dosya, 'kimlik');
    }
  }

  // 2. İLETİŞİM SORULARINI KONTROL ET
  for (const [soru, dosya] of Object.entries(iletisimSorulari)) {
    if (cleanMessage.includes(soru)) {
      console.log(`📞 İletişim sorusu eşleşti: "${soru}" -> ${dosya}`);
      return createDiyalogCevabi(soru, dosya, 'iletisim');
    }
  }

  // 3. FİRMA BİLGİSİ SORULARINI KONTROL ET
  for (const [soru, dosya] of Object.entries(firmaSorulari)) {
    if (cleanMessage.includes(soru)) {
      console.log(`🏢 Firma sorusu eşleşti: "${soru}" -> ${dosya}`);
      return createDiyalogCevabi(soru, dosya, 'firma');
    }
  }

  // FİYAT SORGULARI
  const priceQueries = {
    'yeşil sigorta fiyat': 'yesil_sigorta_fiyatlari',
    'yesil sigorta fiyat': 'yesil_sigorta_fiyatlari',
    'yeşil sigorta fiyatı': 'yesil_sigorta_fiyatlari', 
    'yesil sigorta fiyati': 'yesil_sigorta_fiyatlari',
    'yeşil sigorta ne kadar': 'yesil_sigorta_fiyatlari',
    'yesil sigorta ne kadar': 'yesil_sigorta_fiyatlari',
    'yeşil sigorta ücreti': 'yesil_sigorta_fiyatlari',
    'yesil sigorta ucreti': 'yesil_sigorta_fiyatlari',
    'yeşil sigorta fiyatları': 'yesil_sigorta_fiyatlari',
    'yeşil sigorta fiyatlari': 'yesil_sigorta_fiyatlari',
    'trafik sigortası fiyat': 'trafik_sigortasi_fiyat_akisi',
    'trafik sigortasi fiyat': 'trafik_sigortasi_fiyat_akisi'
  };

  for (const [priceQuery, serviceKey] of Object.entries(priceQueries)) {
    if (cleanMessage.includes(priceQuery)) {
      console.log(`💰 Fiyat sorgusu eşleşti: "${priceQuery}" -> ${serviceKey}`);
      
      if (services['fiyat_listeleri'] && services['fiyat_listeleri'][serviceKey]) {
        return { 
          type: 'service', 
          data: services['fiyat_listeleri'][serviceKey], 
          category: 'fiyat_listeleri', 
          name: serviceKey 
        };
      }
    }
  }

  // TAM EŞLEŞMELER - TÜM SERVİSLER
  const exactMatches = {
    // === SİGORTA HİZMETLERİ ===
    'yeşil sigorta': 'yesil_sigorta',
    'yesil sigorta': 'yesil_sigorta',
    'trafik sigortası': 'trafik_sigortasi',
    'trafik sigortasi': 'trafik_sigortasi',
    'kasko sigortası': 'kasko',
    'kasko sigortasi': 'kasko',
    'koltuk sigortası': 'koltuk_sigortasi',
    'koltuk sigortasi': 'koltuk_sigortasi',
    'dask sigortası': 'dask',
    'dask sigortasi': 'dask',
    'konut sigortası': 'konut_sigortasi',
    'konut sigortasi': 'konut_sigortasi',
    'işyeri sigortası': 'isyeri_sigortasi',
    'isyeri sigortasi': 'isyeri_sigortasi',
    'seyahat sağlık sigortası': 'seyahat_saglik_sigortasi',
    'seyahat saglik sigortasi': 'seyahat_saglik_sigortasi',
    'tamamlayıcı sağlık sigortası': 'tamamlayici_saglik_sigortasi',
    'tamamlayici saglik sigortasi': 'tamamlayici_saglik_sigortasi',
    'özel sağlık sigortası': 'ozel_saglik_sigortasi',
    'ozel saglik sigortasi': 'ozel_saglik_sigortasi',

    // === YAZILIM TALEPLERİ ===
    'özel yazılım geliştirme': 'ozel_yazilim_gelistirme',
    'ozel yazilim geliştirme': 'ozel_yazilim_gelistirme',
    'yazılım geliştirme': 'ozel_yazilim_gelistirme',
    'yazilim geliştirme': 'ozel_yazilim_gelistirme',
    'mobil uygulama geliştirme': 'mobil_uygulama_gelistirme',
    'mobil uygulama': 'mobil_uygulama_gelistirme',
    'uygulama geliştirme': 'mobil_uygulama_gelistirme',

    // === SİBER GÜVENLİK ===
    'genel ağ güvenliği': 'genel_ag_guvenligi',
    'genel ag guvenligi': 'genel_ag_guvenligi',
    'kullanıcı güvenliği': 'kullanici_guvenligi',
    'kullanici guvenligi': 'kullanici_guvenligi',
    'veri güvenliği': 'veri_guvenligi',
    'veri guvenligi': 'veri_guvenligi',
    'uygulama güvenliği': 'uygulama_guvenligi',
    'uygulama guvenligi': 'uygulama_guvenligi',
    'kimlik ve erişim yönetimi': 'kimlik_erisim_yonetimi',
    'kimlik erisim yonetimi': 'kimlik_erisim_yonetimi',
    'güvenlik yönetimi': 'guvenlik_yonetimi',
    'guvenlik yonetimi': 'guvenlik_yonetimi',
    'penetrasyon test talebi': 'penetrasyon_test_talebi',
    'penetrasyon test': 'penetrasyon_test_talebi',
    'siber güvenlik eğitimi': 'egitim_talepleri',
    'siber guvenlik egitimi': 'egitim_talepleri',

    // === LOJİSTİK HİZMETLERİ ===
    'yurtiçi yük nakli': 'yurtici_yuk_nakli',
    'yurtici yuk nakli': 'yurtici_yuk_nakli',
    'yurtiçi nakliye': 'yurtici_yuk_nakli',
    'yurtdışı yük nakli': 'yurtdisi_yuk_nakli',
    'yurtdisi yuk nakli': 'yurtdisi_yuk_nakli',
    'yurtdışı nakliye': 'yurtdisi_yuk_nakli',
    'depo antrepo hizmeti': 'depo_antrepo_hizmeti',
    'depo hizmeti': 'depo_antrepo_hizmeti',
    'antrepo hizmeti': 'depo_antrepo_hizmeti',

    // === İTHALAT İHRACAT ===
    'yurtdışı müşteri araştırma': 'yurtdisi_musteri_arastirma',
    'yurtdisi musteri arastirma': 'yurtdisi_musteri_arastirma',
    'yurtiçi tedarikçi araştırma': 'yurtici_tedarikci_arastirma',
    'yurtici tedarikci arastirma': 'yurtici_tedarikci_arastirma',
    'gümrük operasyon hizmetleri': 'gumruk_operasyon_hizmetleri',
    'gumruk operasyon hizmetleri': 'gumruk_operasyon_hizmetleri',
    'gümrük hizmetleri': 'gumruk_operasyon_hizmetleri',
    'yurtiçi ürün araştırma': 'yurtici_urun_arastirma',
    'yurtici urun arastirma': 'yurtici_urun_arastirma',
    'yurtdışı pazar araştırma': 'yurtdisi_pazar_arastirma',
    'yurtdisi pazar arastirma': 'yurtdisi_pazar_arastirma',

    // === PROFESYONEL DENETLEME ===
    'iç denetim hizmeti': 'ic_denetim_hizmeti',
    'ic denetim hizmeti': 'ic_denetim_hizmeti',
    'tedarikçi müşteri mali denetim': 'tedarikci_musteri_mali_denetim',
    'tedarikci musteri mali denetim': 'tedarikci_musteri_mali_denetim',
    'tedarikçi kalite denetim': 'tedarikci_kalite_denetim',
    'tedarikci kalite denetim': 'tedarikci_kalite_denetim',
    'tedarikçi üretim denetleme': 'tedarikci_uretim_denetleme',
    'tedarikci uretim denetleme': 'tedarikci_uretim_denetleme',
    'firma temsil hizmeti': 'firma_temsil_hizmeti',

    // === İNŞAAT EMLAK ===
    'satılık gayrimenkul': 'satilik_gayrimenkul',
    'satilik gayrimenkul': 'satilik_gayrimenkul',
    'kiralık gayrimenkul': 'kiralik_gayrimenkul',
    'kiralik gayrimenkul': 'kiralik_gayrimenkul',
    'yurtdışı gayrimenkul yatırım': 'yurtdisi_gayrimenkul_yatirim',
    'yurtdisi gayrimenkul yatirim': 'yurtdisi_gayrimenkul_yatirim',
    'inşaat taahhüt hizmeti': 'insaat_taahhut_hizmeti',
    'insaat taahhut hizmeti': 'insaat_taahhut_hizmeti',

    // === CRM HİZMETLERİ ===
    'müşteri seçimi': 'musteri_secimi',
    'musteri secimi': 'musteri_secimi',
    'müşteri edinme': 'musteri_edinme',
    'musteri edinme': 'musteri_edinme',
    'müşteri koruma': 'musteri_koruma',
    'musteri koruma': 'musteri_koruma',
    'müşteri derinleştirme': 'musteri_derinlestirme',
    'musteri derinlestirme': 'musteri_derinlestirme',

    // === TEKSTİL ÜRÜNLERİ ===
    'erkek giyim': 'erkek_giyim',
    'kadın giyim': 'kadin_giyim',
    'kadin giyim': 'kadin_giyim',
    'ev tekstil ürünleri': 'ev_tekstil_urunleri',
    'ev tekstil urunleri': 'ev_tekstil_urunleri',

    // === KOZMETİK ÜRÜNLERİ ===
    'parfüm': 'parfum',
    'parfum': 'parfum',
    'deodorant': 'deodorant',
    'kişisel bakım': 'kisisel_bakim',
    'kisisel bakim': 'kisisel_bakim',
    'medikal kozmetik': 'medikal_kozmetik',

    // === TUR ORGANİZASYON ===
    'yurtiçi özel gezi talebi': 'yurtici_ozel_gezi_talebi',
    'yurtici ozel gezi talebi': 'yurtici_ozel_gezi_talebi',
    'yurtdışı özel gezi talebi': 'yurtdisi_ozel_gezi_talebi',
    'yurtdisi ozel gezi talebi': 'yurtdisi_ozel_gezi_talebi',
    'personel servis talebi': 'personel_servis_talebi',

    // === GÜNEŞ ENERJİSİ SİSTEMLERİ ===
    'güneş verimlilik hesabı': 'gunes_verimlilik_hesabi',
    'gunes verimlilik hesabi': 'gunes_verimlilik_hesabi',
    'ges üretim hesaplama': 'ges_uretim_hesaplama',
    'ges uretim hesaplama': 'ges_uretim_hesaplama',
    'ges kurulum hesaplama': 'ges_kurulum_hesaplama',

    // === KURUMSAL HİZMETLER ===
    'insan kaynakları danışmanlığı': 'insan_kaynaklari_danismanligi',
    'stratejik planlama danışmanlığı': 'stratejik_planlama_danismanligi',
    'finansal danışmanlık': 'finansal_danismanlik',
    'operasyonel iyileştirme': 'operasyonel_iyilestirme',
    'kurumsal iletişim danışmanlığı': 'kurumsal_iletisim_danismanligi',
    'yasal danışmanlık': 'yasal_danismanlik',
    'teknoloji danışmanlığı': 'teknoloji_danismanligi',
    'kurumsal eğitim hizmetleri': 'kurumsal_egitim_hizmetleri'
  };

  for (const [exactPhrase, serviceKey] of Object.entries(exactMatches)) {
    if (cleanMessage.includes(exactPhrase.toLowerCase())) {
      console.log(`✅ Tam ifade eşleşti: "${exactPhrase}" -> ${serviceKey}`);
      
      // Önce servis olarak ara
      for (const [categoryName, categoryServices] of Object.entries(services)) {
        if (typeof categoryServices === 'object' && categoryServices[serviceKey]) {
          return { 
            type: 'service', 
            data: categoryServices[serviceKey], 
            category: categoryName, 
            name: serviceKey 
          };
        }
      }
      
      // Servis bulunamazsa kategori olarak ara
      if (services[serviceKey]) {
        return { type: 'category', data: services[serviceKey], name: serviceKey };
      }
    }
  }

  // ANAHTAR KELİMELER (kategori eşleştirme)
  const keywordMatches = {
    'sigorta': 'sigorta_ana_kategori',
    'yazılım': 'yazilim_talepleri_ana_kategori',
    'yazilim': 'yazilim_talepleri_ana_kategori',
    'siber': 'siber_guvenlik_ana',
    'güvenlik': 'siber_guvenlik_ana',
    'lojistik': 'lojistik_hizmetleri_ana',
    'nakliye': 'lojistik_hizmetleri_ana',
    'ithalat': 'ithalat_ihracat_ana',
    'ihracat': 'ithalat_ihracat_ana',
    'denetim': 'profesyonel_denetleme_ana',
    'denetleme': 'profesyonel_denetleme_ana',
    'emlak': 'insaat_emlak_ana',
    'inşaat': 'insaat_emlak_ana',
    'crm': 'crm_hizmetleri_ana',
    'tekstil': 'tekstil_urunleri_ana',
    'kozmetik': 'kozmetik_urunleri_ana',
    'tur': 'tur_organizasyon_ana',
    'turizm': 'tur_organizasyon_ana',
    'güneş': 'gunes_enerjisi_sistemleri_ana',
    'enerji': 'gunes_enerjisi_sistemleri_ana',
    'kurumsal': 'kurumsal_hizmetler_ana',
    'danışmanlık': 'kurumsal_hizmetler_ana'
  };

  for (const [keyword, serviceKey] of Object.entries(keywordMatches)) {
    if (cleanMessage.includes(keyword)) {
      console.log(`✅ Anahtar kelime eşleşti: "${keyword}" -> ${serviceKey}`);
      
      const categoryData = services[serviceKey];
      if (categoryData) {
        console.log(`✅ Kategori bulundu: ${serviceKey}`);
        return { type: 'category', data: categoryData, name: serviceKey };
      } else {
        console.log(`❌ Kategori bulunamadı: ${serviceKey}`);
        // Alternatif kategori isimlerini dene
        const alternativeKeys = Object.keys(services).filter(key => 
          key.includes(keyword.replace(/[^a-z0-9]/gi, ''))
        );
        if (alternativeKeys.length > 0) {
          console.log(`🔄 Alternatif kategoriler:`, alternativeKeys);
          const alternativeKey = alternativeKeys[0];
          return { type: 'category', data: services[alternativeKey], name: alternativeKey };
        }
      }
    }
  }

  console.log('❌ Eşleşme bulunamadı');
  return null;
}

// Diyalog cevabı oluşturma fonksiyonu - GÜNCELLENDİ
function createDiyalogCevabi(soru, dosyaAdi, tip) {
  try {
    console.log(`💬 Diyalog cevabı oluşturuluyor: ${dosyaAdi}.json, Tip: ${tip}`);
    
    const diyalogDosyasi = serviceLoader.loadJSON(`./genel_diyalog/${dosyaAdi}.json`);
    
    if (!diyalogDosyasi) {
      console.log(`❌ Diyalog dosyası bulunamadı: ${dosyaAdi}`);
      return createFallbackCevap(tip);
    }

    let cevap = '';
    
    switch (tip) {
      case 'kimlik':
        const kimlikCevaplari = diyalogDosyasi.kimlik_sorulari;
        if (kimlikCevaplari) {
          if (soru.includes('sen kimsin')) {
            cevap = kimlikCevaplari.sen_kimsin;
          } else if (soru.includes('ne yap')) {
            cevap = kimlikCevaplari.ne_isyapiyorsun;
          } else if (soru.includes('insan') || soru.includes('robot') || soru.includes('yapay zeka')) {
            cevap = kimlikCevaplari.gercek_insan_misin;
          }
        }
        break;
        
      case 'iletisim':
        const iletisimCevaplari = diyalogDosyasi.insan_destegi;
        if (iletisimCevaplari) {
          if (soru.includes('insan ile') || soru.includes('canlı')) {
            cevap = iletisimCevaplari.insan_ile_gorus;
          } else if (soru.includes('telefon') || soru.includes('numara')) {
            cevap = iletisimCevaplari.telefon_numarasi;
          } else if (soru.includes('web') || soru.includes('site')) {
            cevap = iletisimCevaplari.web_sitesi;
          } else {
            cevap = iletisimCevaplari.insan_ile_gorus;
          }
        }
        break;
        
      case 'firma':
        const firmaBilgisi = diyalogDosyasi;
        if (firmaBilgisi && firmaBilgisi.hizmet_alanlari) {
          cevap = `🏢 *${firmaBilgisi.firma_adi || 'PlanB Global Network Ltd Şti'}*\n\n` +
                 `📋 *Hizmet Alanları:*\n` +
                 firmaBilgisi.hizmet_alanlari.map((hizmet, index) => `${index + 1}. ${hizmet}`).join('\n') +
                 `\n\n${firmaBilgisi.iletisim || 'İnsan desteğine ihtiyaç duyduğunuzda sizi ilgili departmanlara yönlendirebilirim.'}`;
        }
        break;
    }

    if (cevap) {
      console.log(`✅ Diyalog cevabı oluşturuldu: ${tip}`);
      return {
        type: 'diyalog',
        data: { cevap: cevap },
        category: 'genel_diyalog',
        name: dosyaAdi
      };
    }
    
  } catch (error) {
    console.log(`❌ Diyalog cevabı oluşturma hatası: ${error.message}`);
  }
  
  return createFallbackCevap(tip);
}

// Fallback cevap oluşturma
function createFallbackCevap(tip) {
  let cevap = '';
  
  switch (tip) {
    case 'kimlik':
      cevap = 'Ben ARYA, PlanB Global Network Ltd Şti için hizmet veren yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?';
      break;
    case 'iletisim':
      cevap = 'İnsan desteğine ihtiyaç duyduğunuzda sizi ilgili departmanlara yönlendirebilirim. Hangi konuda yardıma ihtiyacınız var?';
      break;
    case 'firma':
      cevap = `🏢 *PlanB Global Network Ltd Şti*\n\n` +
             `📋 *Hizmet Alanları:*\n` +
             `1. Sigorta Hizmetleri\n2. Yazılım Talepleri\n3. Siber Güvenlik\n4. Lojistik Hizmetleri\n5. İthalat İhracat\n6. Profesyonel Denetleme\n7. İnşaat Emlak\n8. CRM Hizmetleri\n9. Tekstil Ürünleri\n10. Kozmetik Ürünleri\n11. Tur Organizasyon\n12. Güneş Enerjisi Sistemleri\n13. Kurumsal Hizmetler\n\n` +
             `İnsan desteğine ihtiyaç duyduğunuzda sizi ilgili departmanlara yönlendirebilirim.`;
      break;
  }
  
  return {
    type: 'diyalog',
    data: { cevap: cevap },
    category: 'genel_diyalog',
    name: 'fallback'
  };
}

module.exports = {
  findMatchingService
};