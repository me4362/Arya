// index.js - ARYA Bot Ana Dosyası (QR ENDPOINT EKLENDİ) - ADMIN SİSTEMİ ENTEGRE
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

// Admin komut sistemini ekle - YENİ
const adminHandler = require('./commands/admin');

// Global client utility
const { setGlobalClient } = require('./modules/utils/globalClient');

// QR kod değişkeni
let currentQR = null;
let qrGenerated = false;

// WhatsApp client oluşturma
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: "./session"
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  }
});

// Global client'ı başlat
setGlobalClient(client);
console.log('🌐 ARYA Bot başlatılıyor...');

// QR kodu oluşturma
client.on('qr', (qr) => {
  currentQR = qr;
  qrGenerated = true;
  
  console.log('\n📱 WHATSAPP BAĞLANTI KODU:');
  console.log('========================');
  qrcode.generate(qr, { small: true });
  console.log('========================');
  console.log('📲 QR Kodu: https://arya-zr46.onrender.com/qr');
  console.log('📲 Veya: https://arya-zr46.onrender.com/qr-image');
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
  
  if (client.info) {
    console.log(`📱 Bağlı kullanıcı: ${client.info.pushname}`);
    console.log(`📞 Telefon: ${client.info.wid.user}`);
  }
  
  logger.info('ARYA Bot başlatıldı ve WhatsApp\'a bağlandı');
});

// Mesaj alma - GÜNCELLENDİ (Admin sistemi eklendi)
client.on('message', async (message) => {
  try {
    // ÖNCE admin komutlarını kontrol et - YENİ
    await adminHandler(message, client);
    
    // Sonra normal mesaj işleme
    await messageHandler.handleMessage(message);
  } catch (error) {
    logger.error(`Mesaj işleme hatası: ${error.message}`);
    try {
      const response = await hfAsistan.generateResponse(message.body);
      await message.reply(response);
    } catch (hfError) {
      await message.reply('❌ Üzgünüm, bir hata oluştu.');
    }
  }
});

// Express sunucusu
const app = express();
const PORT = process.env.PORT || 5000;

// QR Endpoint - JSON formatında
app.get('/qr', (req, res) => {
  if (!qrGenerated || !currentQR) {
    return res.json({
      status: 'error',
      message: 'QR kodu henüz oluşturulmadı veya bot zaten bağlı',
      connected: client.info ? true : false
    });
  }
  
  res.json({
    status: 'success',
    message: 'QR kodu oluşturuldu, WhatsApp Web ile tarayın',
    qr_code: currentQR,
    connected: false,
    timestamp: new Date().toISOString()
  });
});

// QR Endpoint - Görsel formatında
app.get('/qr-image', async (req, res) => {
  if (!qrGenerated || !currentQR) {
    return res.json({
      status: 'error',
      message: 'QR kodu henüz oluşturulmadı veya bot zaten bağlı'
    });
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
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📱 ARYA Bot WhatsApp Bağlantısı</h1>
          <div class="instructions">
            <h3>Bağlantı Talimatları:</h3>
            <p>1. Telefonunuzda WhatsApp'ı açın</p>
            <p>2. WhatsApp Web'e gidin</p>
            <p>3. Aşağıdaki QR kodu tarayın</p>
          </div>
          <div class="qr-image">
            <img src="${qrImage}" alt="WhatsApp QR Code" style="max-width: 300px;">
          </div>
          <p><strong>Bot Durumu:</strong> QR Bekleniyor</p>
          <p><a href="/health">Bot Durumunu Kontrol Et</a></p>
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
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'ARYA Bot API Service',
    endpoints: {
      health: '/health',
      qr: '/qr',
      qr_image: '/qr-image',
      services: '/services'
    },
    documentation: 'ARYA Bot için REST API servisi'
  });
});

// Services endpoint
app.get('/services', (req, res) => {
  try {
    const services = serviceLoader.loadAllServices();
    res.json({
      success: true,
      data: services,
      count: Object.keys(services).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Servisler yüklenirken hata oluştu'
    });
  }
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 ARYA Bot API http://0.0.0.0:${PORT} adresinde çalışıyor`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📱 QR Kod: http://0.0.0.0:${PORT}/qr-image`);
  logger.info(`ARYA Bot API ${PORT} portunda başlatıldı`);
});

// Botu başlat
client.initialize().catch(error => {
  logger.error(`Bot başlatma hatası: ${error.message}`);
  console.log('❌ Bot başlatılamadı:', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 ARYA Bot kapatılıyor...');
  try {
    await client.destroy();
    console.log('✅ WhatsApp client temizlendi');
  } catch (error) {
    console.log('⚠️ Client temizleme hatası:', error.message);
  }
  process.exit(0);
});