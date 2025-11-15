// index.js - ARYA Bot Ana Dosyası (KONSOLİDE EDİLMİŞ & OPTİMİZE)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrcodeLibrary = require('qrcode'); // QR görsel için
const express = require('express');
const path = require('path');

// Hugging Face Asistanını ekle
const HuggingFaceAsistan = require('./huggingface-asistan');
const hfAsistan = new HuggingFaceAsistan();

// Modülleri import et
const logger = require('./modules/logger');
const sessionManager = require('./modules/sessionManager');
const serviceLoader = require('./modules/serviceLoader');
const messageHandler = require('./modules/messageHandler');
const menuHandler = require('./modules/menuHandler');

// Admin komut sistemini ekle
const adminHandler = require('./commands/admin');

// Global client utility
const { setGlobalClient } = require('./modules/utils/globalClient');

// QR kod değişkenleri
let currentQR = null;
let qrGenerated = false;

// WhatsApp client oluşturma
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer'
    ]
  }
});

// Global client'ı başlat
setGlobalClient(client);
console.log('🌐 Global client instance başlatıldı');

// QR kodu oluşturma
client.on('qr', (qr) => {
  currentQR = qr;
  qrGenerated = true;
  
  console.log('\n📱 WHATSAPP BAĞLANTI KODU:');
  console.log('========================');
  qrcode.generate(qr, { small: true });
  console.log('========================');
  console.log('📲 QR Kodu: http://0.0.0.0:5000/qr-image');
  console.log('📲 JSON: http://0.0.0.0:5000/qr');
  console.log('========================');
  logger.info('QR kodu oluşturuldu - Web üzerinden tarayabilirsiniz');
});

// Bağlantı başarılı
client.on('ready', () => {
  currentQR = null;
  qrGenerated = false;
  
  console.log('\n✅ ARYA BOT BAŞARIYLA BAĞLANDI!');
  console.log('🤖 Bot: ARYA');
  console.log('🏢 Firma: PlanB Global Network Ltd Şti');
  console.log('🚀 Geliştirici: EurAsia Trade And Technology Bulgaria EOOD - ÆSIR Ekibi');
  
  // Client'ın gerçekten hazır olduğunu kontrol et
  if (client.info) {
    console.log(`📱 Bağlı kullanıcı: ${client.info.pushname}`);
    console.log(`📞 Telefon: ${client.info.wid.user}`);
  }
  
  logger.info('ARYA Bot başlatıldı ve WhatsApp\'a bağlandı');
});

// Bağlantı hatası
client.on('auth_failure', (msg) => {
  logger.error('WhatsApp bağlantı hatası: ' + msg);
  console.log('❌ WhatsApp bağlantı hatası. Lütfen tekrar deneyin.');
  console.log('💡 Oturum dosyalarını silmek için: rm -rf session/');
});

// Bağlantı kesildi - OTOMATİK YENİDEN BAĞLANMA
client.on('disconnected', (reason) => {
  logger.warn('WhatsApp bağlantısı kesildi: ' + reason);
  console.log('🔌 WhatsApp bağlantısı kesildi. 5 saniye sonra yeniden bağlanılıyor...');
  
  setTimeout(() => {
    console.log('🔄 WhatsApp bağlantısı yeniden deneniyor...');
    client.initialize().catch(err => {
      logger.error('Yeniden bağlanma hatası: ' + err.message);
      console.log('❌ Yeniden bağlanma başarısız. Lütfen manuel olarak kontrol edin.');
    });
  }, 5000);
});

// Mesaj alma - KONSOLİDE EDİLMİŞ MANTIK
client.on('message', async (message) => {
  try {
    // ÖNCE admin komutlarını kontrol et
    const isAdminCommand = await adminHandler(message, client);
    
    // Eğer admin komutu işlendiyse normal mesaj işlemeyi atla
    if (isAdminCommand) {
      return;
    }
    
    // Sonra modüler mesaj işleyiciyi çalıştır
    await messageHandler.handleMessage(message);
    
  } catch (error) {
    logger.error(`Mesaj işleme hatası: ${error.message}`);
    console.error('❌ Mesaj işlenirken hata:', error);
    
    // Modüler sistemde hata olursa, Hugging Face ile yanıt ver
    try {
      console.log(`📨 Hugging Face ile yanıt oluşturuluyor: ${message.body}`);
      
      // Hugging Face ile akıllı yanıt
      const intelligentResponse = await hfAsistan.generateResponse(message.body);
      const { sendMessageWithoutQuote } = require('./modules/utils/globalClient');
      await sendMessageWithoutQuote(message.from, intelligentResponse);
      
    } catch (hfError) {
      console.error('❌ Hugging Face yanıt hatası:', hfError);
      
      // Son çare olarak genel hata mesajı
      try {
        const { sendMessageWithoutQuote } = require('./modules/utils/globalClient');
        await sendMessageWithoutQuote(message.from, '❌ Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
      } catch (replyError) {
        logger.error(`Hata mesajı gönderilemedi: ${replyError.message}`);
      }
    }
  }
});

// Express sunucusu
const app = express();
const PORT = process.env.PORT || 5000;

// Environment variable kontrolü
if (!process.env.PORT) {
  console.log('⚠️  PORT environment variable bulunamadı, varsayılan 5000 kullanılıyor');
}

app.use(express.json());

// QR Endpoint - JSON formatında
app.get('/qr', (req, res) => {
  if (!qrGenerated || !currentQR) {
    return res.json({
      status: 'error',
      message: 'QR kodu henüz oluşturulmadı veya bot zaten bağlı',
      connected: client.info ? true : false,
      bot_ready: client.info ? true : false
    });
  }
  
  res.json({
    status: 'success',
    message: 'QR kodu oluşturuldu, WhatsApp Web ile tarayın',
    qr_code: currentQR,
    connected: false,
    bot_ready: false,
    timestamp: new Date().toISOString()
  });
});

// QR Endpoint - Görsel formatında
app.get('/qr-image', async (req, res) => {
  if (!qrGenerated || !currentQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ARYA Bot - Durum</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; }
          .status { background: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 ARYA Bot</h1>
          <div class="status">
            <h3>✅ Bot Zaten Bağlı</h3>
            <p>ARYA botu WhatsApp'a başarıyla bağlandı.</p>
          </div>
          <p><a href="/health">Bot Durumunu Kontrol Et</a></p>
        </div>
      </body>
      </html>
    `);
  }
  
  try {
    const qrImage = await qrcodeLibrary.toDataURL(currentQR);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ARYA Bot - QR Kod</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; }
          .qr-image { margin: 20px 0; }
          .instructions { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .status { background: #ff9800; color: white; padding: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 ARYA Bot WhatsApp Bağlantısı</h1>
          <div class="status">
            <strong>Durum:</strong> QR Bekleniyor
          </div>
          <div class="instructions">
            <h3>Bağlantı Talimatları:</h3>
            <p>1. Telefonunuzda WhatsApp'ı açın</p>
            <p>2. WhatsApp Web'e gidin</p>
            <p>3. Aşağıdaki QR kodu tarayın</p>
          </div>
          <div class="qr-image">
            <img src="${qrImage}" alt="WhatsApp QR Code" style="max-width: 300px;">
          </div>
          <p><a href="/health">Bot Durumunu Kontrol Et</a> | <a href="/qr">JSON API</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'QR görsel oluşturulamadı'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const botStatus = client.info ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'OK', 
    bot: 'ARYA', 
    version: '1.0.0',
    company: 'PlanB Global Network Ltd Şti',
    whatsapp_status: botStatus,
    qr_available: qrGenerated && !client.info,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    qr_endpoints: {
      json: '/qr',
      image: '/qr-image'
    }
  });
});

// Services endpoint
app.get('/services', (req, res) => {
  try {
    const services = serviceLoader.loadAllServices();
    res.json({
      success: true,
      data: services,
      count: Object.keys(services).length,
      loaded_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Services endpoint hatası: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Servisler yüklenirken hata oluştu'
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ARYA Bot API Service',
    endpoints: {
      health: '/health',
      qr: '/qr',
      qr_image: '/qr-image',
      services: '/services'
    },
    documentation: 'ARYA Bot için REST API servisi',
    company: 'PlanB Global Network Ltd Şti'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    available_endpoints: ['/health', '/qr', '/qr-image', '/services']
  });
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 ARYA Bot API http://0.0.0.0:${PORT} adresinde çalışıyor`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📋 Servisler: http://0.0.0.0:${PORT}/services`);
  console.log(`📱 QR Kod: http://0.0.0.0:${PORT}/qr-image`);
  logger.info(`ARYA Bot API ${PORT} portunda başlatıldı`);
});

// Botu başlat
console.log('🚀 ARYA Bot başlatılıyor...');
console.log('📁 Modüler yapı yükleniyor...');
console.log('🤖 Hugging Face Asistanı aktif!');
console.log('⚡ Admin komut sistemi aktif!');

client.initialize().catch(error => {
  logger.error(`Bot başlatma hatası: ${error.message}`);
  console.log('❌ Bot başlatılamadı:', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 ARYA Bot kapatılıyor...');
  
  // Tüm timer'ları temizle
  const timeoutManager = require('./modules/saleFlow/timeoutManager');
  timeoutManager.clearAllSaleTimers();
  
  sessionManager.userSessions.forEach(session => {
    if (session.menuTimer) clearTimeout(session.menuTimer);
    if (session.helpTimer) clearTimeout(session.helpTimer);
    if (session.goodbyeTimer) clearTimeout(session.goodbyeTimer);
  });
  
  // Client'ı temizle
  try {
    await client.destroy();
    console.log('✅ WhatsApp client temizlendi');
  } catch (error) {
    console.log('⚠️  Client temizleme hatası:', error.message);
  }
  
  logger.info('ARYA Bot kapatıldı');
  console.log('👋 ARYA Bot başarıyla kapatıldı');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 ARYA Bot SIGTERM sinyali aldı, kapatılıyor...');
  await client.destroy();
  process.exit(0);
});

// Beklenmeyen hatalar
process.on('uncaughtException', (error) => {
  logger.error(`Beklenmeyen hata: ${error.message}`);
  console.log('❌ Kritik hata oluştu:', error.message);
  console.log('🔄 Bot yeniden başlatılabilir...');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`İşlenmemiş Promise: ${reason}`);
  console.log('⚠️  İşlenmemiş Promise hatası:', reason);
});

// Başlangıç kontrolü
setTimeout(() => {
  if (!client.info) {
    console.log('⏳ WhatsApp bağlantısı bekleniyor... QR kodu tarayın.');
    console.log('📲 Web QR: http://0.0.0.0:5000/qr-image');
  }
}, 3000);