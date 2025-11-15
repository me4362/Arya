// index.js - ARYA Bot Ana Dosyası (TÜM ENDPOINT'LER EKLENDİ)
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrcodeLibrary = require('qrcode');
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
const { setGlobalClient, sendMessageWithoutQuote } = require('./modules/utils/globalClient');

// QR kod değişkenleri
let currentQR = null;
let qrGenerated = false;
let isConnected = false;

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
  isConnected = false;
  
  console.log('\n📱 WHATSAPP BAĞLANTI KODU:');
  console.log('========================');
  qrcode.generate(qr, { small: true });
  console.log('========================');
  console.log('🌐 RENDER.COM ENDPOINT LİNKLERİ:');
  console.log('📱 QR Görsel: https://arya-zr46.onrender.com/qr-image');
  console.log('📱 QR JSON: https://arya-zr46.onrender.com/qr');
  console.log('📊 Health check: https://arya-zr46.onrender.com/health');
  console.log('📋 Servisler: https://arya-zr46.onrender.com/services');
  console.log('🏠 Ana Sayfa: https://arya-zr46.onrender.com/');
  console.log('========================');
  logger.info('QR kodu oluşturuldu - Render.com üzerinden tarayabilirsiniz');
});

// Bağlantı başarılı
client.on('ready', () => {
  currentQR = null;
  qrGenerated = false;
  isConnected = true;
  
  console.log('\n✅ ARYA BOT BAŞARIYLA BAĞLANDI!');
  console.log('🤖 Bot: ARYA');
  console.log('🏢 Firma: PlanB Global Network Ltd Şti');
  console.log('🚀 Geliştirici: EurAsia Trade And Technology Bulgaria EOOD - ÆSIR Ekibi');
  
  if (client.info) {
    console.log(`📱 Bağlı kullanıcı: ${client.info.pushname}`);
    console.log(`📞 Telefon: ${client.info.wid.user}`);
  }
  
  console.log('\n🌐 RENDER.COM ENDPOINT LİNKLERİ:');
  console.log('📊 Health check: https://arya-zr46.onrender.com/health');
  console.log('📋 Servisler: https://arya-zr46.onrender.com/services');
  console.log('🏠 Ana Sayfa: https://arya-zr46.onrender.com/');
  console.log('========================');
  
  logger.info('ARYA Bot başlatıldı ve WhatsApp\'a bağlandı');
});

// Bağlantı hatası
client.on('auth_failure', (msg) => {
  isConnected = false;
  logger.error('WhatsApp bağlantı hatası: ' + msg);
  console.log('❌ WhatsApp bağlantı hatası. Lütfen tekrar deneyin.');
  console.log('💡 Oturum dosyalarını silmek için: rm -rf session/');
});

// Bağlantı kesildi - OTOMATİK YENİDEN BAĞLANMA
client.on('disconnected', (reason) => {
  isConnected = false;
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

// Mesaj alma
client.on('message', async (message) => {
  try {
    // ÖNCE admin komutlarını kontrol et
    const isAdminCommand = await adminHandler(message, client);
    
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
      await sendMessageWithoutQuote(message.from, intelligentResponse);
      
    } catch (hfError) {
      console.error('❌ Hugging Face yanıt hatası:', hfError);
      
      // Son çare olarak genel hata mesajı
      try {
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

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ========== TÜM ENDPOINT'LER TANIMLANDI ==========

// Root endpoint - ANA SAYFA
app.get('/', (req, res) => {
  res.json({
    message: '🤖 ARYA Bot API Service - Hoş Geldiniz',
    status: isConnected ? 'connected' : 'disconnected',
    qr_available: qrGenerated && !isConnected,
    company: 'PlanB Global Network Ltd Şti',
    developer: 'EurAsia Trade And Technology Bulgaria EOOD - ÆSIR Ekibi',
    timestamp: new Date().toISOString(),
    endpoints: {
      home: '/',
      health: '/health',
      qr: '/qr',
      qr_image: '/qr-image',
      services: '/services'
    },
    documentation: 'ARYA Bot için REST API servisi'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const botStatus = isConnected ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'OK', 
    bot: 'ARYA', 
    version: '1.0.0',
    company: 'PlanB Global Network Ltd Şti',
    whatsapp_status: botStatus,
    qr_available: qrGenerated && !isConnected,
    is_connected: isConnected,
    qr_generated: qrGenerated,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory_usage: process.memoryUsage(),
    server_port: PORT,
    render_url: 'https://arya-zr46.onrender.com'
  });
});

// QR Endpoint - JSON formatında
app.get('/qr', (req, res) => {
  console.log(`🔍 /qr endpoint çağrıldı - qrGenerated: ${qrGenerated}, isConnected: ${isConnected}`);
  
  if (isConnected) {
    return res.json({
      status: 'connected',
      message: '✅ Bot zaten WhatsApp\'a bağlı',
      connected: true,
      bot_ready: true,
      timestamp: new Date().toISOString(),
      render_url: 'https://arya-zr46.onrender.com'
    });
  }
  
  if (!qrGenerated || !currentQR) {
    return res.json({
      status: 'waiting',
      message: '⏳ QR kodu henüz oluşturulmadı. Lütfen bekleyin...',
      connected: false,
      bot_ready: false,
      timestamp: new Date().toISOString(),
      render_url: 'https://arya-zr46.onrender.com'
    });
  }
  
  res.json({
    status: 'success',
    message: '📱 QR kodu oluşturuldu, WhatsApp Web ile tarayın',
    qr_code: currentQR,
    connected: false,
    bot_ready: false,
    timestamp: new Date().toISOString(),
    qr_image_url: 'https://arya-zr46.onrender.com/qr-image',
    render_url: 'https://arya-zr46.onrender.com'
  });
});

// QR Endpoint - Görsel formatında
app.get('/qr-image', async (req, res) => {
  console.log(`🔍 /qr-image endpoint çağrıldı - qrGenerated: ${qrGenerated}, isConnected: ${isConnected}`);
  
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ARYA Bot - Durum</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
          .container { max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
          .status { background: #4CAF50; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .info { background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0; }
          a { color: #FFD700; text-decoration: none; font-weight: bold; display: inline-block; margin: 10px; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 5px; transition: all 0.3s ease; }
          a:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
          h1 { margin-bottom: 20px; font-size: 2.5em; }
          .links { margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 ARYA Bot</h1>
          <div class="status">
            <h3>✅ Bot Bağlı</h3>
            <p>ARYA botu WhatsApp'a başarıyla bağlandı.</p>
          </div>
          <div class="info">
            <p><strong>📊 Durum:</strong> Aktif ve Çalışıyor</p>
            <p><strong>🕐 Zaman:</strong> ${new Date().toLocaleString('tr-TR')}</p>
            <p><strong>🌐 Sunucu:</strong> Render.com</p>
            <p><strong>🔗 URL:</strong> arya-zr46.onrender.com</p>
          </div>
          <div class="links">
            <a href="/health">📊 Bot Durumu</a>
            <a href="/services">📋 Servisler</a>
            <a href="/">🏠 Ana Sayfa</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
  
  if (!qrGenerated || !currentQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ARYA Bot - QR Bekleniyor</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); color: white; min-height: 100vh; }
          .container { max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
          .status { background: #ff9800; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 2s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          a { color: white; text-decoration: none; font-weight: bold; display: inline-block; margin: 10px; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 5px; transition: all 0.3s ease; }
          a:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
          h1 { margin-bottom: 20px; font-size: 2.5em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 ARYA Bot</h1>
          <div class="status">
            <h3>⏳ QR Kodu Bekleniyor</h3>
            <p>QR kodu henüz oluşturulmadı...</p>
          </div>
          <div class="loader"></div>
          <p>Lütfen sayfayı birkaç saniye sonra yenileyin</p>
          <div style="margin-top: 20px;">
            <a href="/qr">🔄 JSON Durumu Kontrol Et</a>
            <a href="/health">📊 Sistem Durumu</a>
          </div>
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
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
          .container { max-width: 500px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
          .qr-image { margin: 20px 0; padding: 20px; background: white; border-radius: 10px; display: inline-block; }
          .instructions { background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left; }
          .status { background: #ff9800; padding: 15px; border-radius: 8px; margin: 15px 0; }
          a { color: #FFD700; text-decoration: none; font-weight: bold; display: inline-block; margin: 10px; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 5px; transition: all 0.3s ease; }
          a:hover { background: rgba(255,255,255,0.3); transform: translateY(-2px); }
          h1 { margin-bottom: 20px; font-size: 2em; }
          .links { margin-top: 30px; }
          @media (max-width: 600px) {
            .container { padding: 20px; }
            h1 { font-size: 1.8em; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 ARYA Bot WhatsApp Bağlantısı</h1>
          <div class="status">
            <strong>🔴 Durum:</strong> QR Bekleniyor - Bağlanılmadı
          </div>
          
          <div class="instructions">
            <h3>📋 Bağlantı Talimatları:</h3>
            <p>1. 📱 Telefonunuzda WhatsApp'ı açın</p>
            <p>2. 🌐 WhatsApp Web menüsüne gidin</p>
            <p>3. 📷 Aşağıdaki QR kodu tarayın</p>
            <p>4. ✅ Bağlantı onayını bekleyin</p>
          </div>
          
          <div class="qr-image">
            <img src="${qrImage}" alt="WhatsApp QR Code" style="max-width: 300px; border: 2px solid #333;">
          </div>
          
          <div class="info" style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>🌐 Sunucu:</strong> Render.com</p>
            <p><strong>🔗 URL:</strong> arya-zr46.onrender.com</p>
            <p><strong>🕐 Zaman:</strong> ${new Date().toLocaleString('tr-TR')}</p>
          </div>
          
          <div class="links">
            <a href="/health">📊 Bot Durumu</a>
            <a href="/qr">🔗 JSON API</a>
            <a href="/services">📋 Servisler</a>
            <a href="/">🏠 Ana Sayfa</a>
          </div>
          
          <script>
            console.log('🔍 QR sayfası yüklendi - Otomatik yenileme aktif');
            setInterval(() => {
              fetch('/qr')
                .then(response => response.json())
                .then(data => {
                  console.log('🔄 Durum kontrolü:', data.status);
                  if (data.connected) {
                    console.log('✅ Bot bağlandı, sayfa yenileniyor...');
                    window.location.reload();
                  }
                })
                .catch(err => console.log('❌ Durum kontrol hatası:', err));
            }, 5000);
          </script>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('QR görsel oluşturma hatası:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hata</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; color: #dc3545; }
          .error { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ QR oluşturulurken hata</h1>
          <p>${error.message}</p>
          <a href="/" style="color: #007bff; text-decoration: none;">Ana Sayfaya Dön</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Services endpoint
app.get('/services', (req, res) => {
  try {
    const services = serviceLoader.loadAllServices();
    res.json({
      success: true,
      data: services,
      count: Object.keys(services).length,
      loaded_at: new Date().toISOString(),
      render_url: 'https://arya-zr46.onrender.com'
    });
  } catch (error) {
    logger.error(`Services endpoint hatası: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Servisler yüklenirken hata oluştu',
      render_url: 'https://arya-zr46.onrender.com'
    });
  }
});

// 404 handler - GÜNCELLENDİ
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    requested_url: req.originalUrl,
    available_endpoints: [
      '/',
      '/health', 
      '/qr',
      '/qr-image',
      '/services'
    ],
    render_url: 'https://arya-zr46.onrender.com'
  });
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌐 ARYA Bot API Sunucusu Başlatıldı:`);
  console.log(`📍 Yerel Adres: http://localhost:${PORT}`);
  console.log(`🌍 Ağ Adresi: http://0.0.0.0:${PORT}`);
  console.log(`🚀 Render.com URL: https://arya-zr46.onrender.com`);
  console.log(`📊 Health check: https://arya-zr46.onrender.com/health`);
  console.log(`📋 Servisler: https://arya-zr46.onrender.com/services`);
  console.log(`📱 QR Görsel: https://arya-zr46.onrender.com/qr-image`);
  console.log(`📱 QR JSON: https://arya-zr46.onrender.com/qr`);
  console.log(`🏠 Ana Sayfa: https://arya-zr46.onrender.com/`);
  console.log('================================');
  logger.info(`ARYA Bot API ${PORT} portunda başlatıldı - Render.com`);
});

// Botu başlat
console.log('🚀 ARYA Bot başlatılıyor...');
console.log('📁 Modüler yapı yükleniyor...');
console.log('🤖 Hugging Face Asistanı aktif!');
console.log('⚡ Admin komut sistemi aktif!');
console.log('🔗 Tüm endpoint\'ler aktif!');

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
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`İşlenmemiş Promise: ${reason}`);
  console.log('⚠️  İşlenmemiş Promise hatası:', reason);
});

// Başlangıç kontrolü
setTimeout(() => {
  if (!isConnected) {
    console.log('\n⏳ WhatsApp bağlantısı bekleniyor...');
    console.log('📱 QR kodunu taramak için şu linki kullanın:');
    console.log('   https://arya-zr46.onrender.com/qr-image');
    console.log('\n🔗 Diğer bağlantılar:');
    console.log('   📊 Durum: https://arya-zr46.onrender.com/health');
    console.log('   📋 Servisler: https://arya-zr46.onrender.com/services');
    console.log('   🏠 Ana Sayfa: https://arya-zr46.onrender.com/');
  }
}, 3000);
