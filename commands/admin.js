// commands/admin.js - OTOMATİK ÖĞRENME ÖZELLİKLERİ EKLENDİ
const fs = require('fs');
const path = require('path');
const MemoryManager = require('../memory/memoryManager');

// Admin numaralarını yükle
function loadAdminNumbers() {
    try {
        const adminFile = path.join(__dirname, '../config/admin.txt');
        if (!fs.existsSync(adminFile)) {
            // Admin dosyası yoksa oluştur
            fs.writeFileSync(adminFile, '');
            console.log('⚠️  admin.txt dosyası oluşturuldu. Lütfen admin numaralarını ekleyin.');
            return [];
        }
        
        const data = fs.readFileSync(adminFile, 'utf8');
        return data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('//'));
    } catch (error) {
        console.error('❌ admin.txt okunamadı:', error);
        return [];
    }
}

// Admin kontrolü
function isAdmin(phoneNumber) {
    const adminNumbers = loadAdminNumbers();
    // WhatsApp numara formatını normalize et
    const normalizedNumber = phoneNumber.replace(/@c.us$/g, '').trim();
    return adminNumbers.includes(normalizedNumber);
}

// Dosya uzantısı kontrolü
function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

// Dosya buffer'ını oku (WhatsApp dosya mesajından)
async function readFileBuffer(message) {
    try {
        if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media) {
                return Buffer.from(media.data, 'base64');
            }
        }
        return null;
    } catch (error) {
        throw new Error(`Dosya okunamadı: ${error.message}`);
    }
}

module.exports = async (message, client) => {
    const phoneNumber = message.from;
    const messageBody = message.body;
    
    // Admin kontrolü
    if (!isAdmin(phoneNumber)) {
        return; // Admin değilse işlem yapma
    }

    const memoryManager = new MemoryManager();

    try {
        // !öğret komutu - MANUEL ÖĞRENME
        if (messageBody.startsWith('!öğret')) {
            const content = messageBody.replace('!öğret', '').trim();
            
            if (!content.includes('::')) {
                await message.reply('❌ Format: !öğret soru::cevap\nÖrnek: !öğret kargo süresi::2 iş günü');
                return;
            }

            const [soru, cevap] = content.split('::').map(part => part.trim());
            
            if (!soru || !cevap) {
                await message.reply('❌ Soru ve cevap boş olamaz!');
                return;
            }

            const result = await memoryManager.addKnowledge(soru, cevap);
            
            if (result) {
                await message.reply(`✅ Öğrendim! \n*Soru:* ${soru}\n*Cevap:* ${cevap}\n\nAnahtar kelimeler: ${result.anahtar_kelimeler.join(', ')}`);
            } else {
                await message.reply('❌ Bilgi kaydedilemedi!');
            }
        }

        // !web-öğret komutu - WEB SİTESİNDEN OTOMATİK ÖĞRENME
        else if (messageBody.startsWith('!web-öğret')) {
            const url = messageBody.replace('!web-öğret', '').trim();
            
            if (!url) {
                await message.reply('❌ Format: !web-öğret <url>\nÖrnek: !web-öğret https://orneksite.com');
                return;
            }

            // URL formatı kontrolü
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                await message.reply('❌ Geçersiz URL formatı! http:// veya https:// ile başlamalı.');
                return;
            }

            try {
                const AutoLearningManager = require('../modules/autoLearning/autoLearningManager');
                const autoLearning = new AutoLearningManager();
                
                await message.reply(`🌐 Web sitesi taranıyor: ${url}\n\nBu işlem birkaç dakika sürebilir...`);
                
                const result = await autoLearning.learnFromWebsite(url, message);
                
                if (result.success) {
                    // Başarı mesajı zaten AutoLearningManager tarafından gönderildi
                    console.log(`✅ Web öğrenme tamamlandı: ${result.savedCount} bilgi kaydedildi`);
                } else {
                    await message.reply(`❌ Web sitesinden öğrenme başarısız: ${result.error}`);
                }
                
            } catch (error) {
                await message.reply(`❌ Web öğrenme hatası: ${error.message}`);
            }
        }

        // !pdf-öğret komutu - PDF'DEN OTOMATİK ÖĞRENME
        else if (messageBody.startsWith('!pdf-öğret')) {
            try {
                if (!message.hasMedia) {
                    await message.reply('❌ Lütfen bir PDF dosyası gönderin!\n\nFormat: !pdf-öğret yazın ve PDF dosyasını ekleyin');
                    return;
                }

                const buffer = await readFileBuffer(message);
                if (!buffer) {
                    await message.reply('❌ PDF dosyası okunamadı!');
                    return;
                }

                // Dosya uzantısı kontrolü
                const filename = message.body || 'document.pdf';
                if (getFileExtension(filename) !== 'pdf') {
                    await message.reply('❌ Bu bir PDF dosyası değil! Lütfen .pdf uzantılı dosya gönderin.');
                    return;
                }

                const AutoLearningManager = require('../modules/autoLearning/autoLearningManager');
                const autoLearning = new AutoLearningManager();
                
                await message.reply('📄 PDF dosyası işleniyor...\n\nBu işlem birkaç dakika sürebilir.');
                
                const result = await autoLearning.learnFromPDF(buffer, filename, message);
                
                if (!result.success) {
                    await message.reply(`❌ PDF öğrenme başarısız: ${result.error}`);
                }
                
            } catch (error) {
                await message.reply(`❌ PDF işleme hatası: ${error.message}`);
            }
        }

        // !word-öğret komutu - WORD DOSYASINDAN OTOMATİK ÖĞRENME
        else if (messageBody.startsWith('!word-öğret')) {
            try {
                if (!message.hasMedia) {
                    await message.reply('❌ Lütfen bir Word dosyası gönderin!\n\nFormat: !word-öğret yazın ve Word dosyasını ekleyin');
                    return;
                }

                const buffer = await readFileBuffer(message);
                if (!buffer) {
                    await message.reply('❌ Word dosyası okunamadı!');
                    return;
                }

                // Dosya uzantısı kontrolü
                const filename = message.body || 'document.docx';
                const validExtensions = ['doc', 'docx'];
                if (!validExtensions.includes(getFileExtension(filename))) {
                    await message.reply('❌ Bu bir Word dosyası değil! Lütfen .doc veya .docx uzantılı dosya gönderin.');
                    return;
                }

                const AutoLearningManager = require('../modules/autoLearning/autoLearningManager');
                const autoLearning = new AutoLearningManager();
                
                await message.reply('📝 Word dosyası işleniyor...\n\nBu işlem birkaç dakika sürebilir.');
                
                const result = await autoLearning.learnFromWord(buffer, filename, message);
                
                if (!result.success) {
                    await message.reply(`❌ Word öğrenme başarısız: ${result.error}`);
                }
                
            } catch (error) {
                await message.reply(`❌ Word işleme hatası: ${error.message}`);
            }
        }

        // !liste komutu
        else if (messageBody === '!liste') {
            const bilgiler = memoryManager.listKnowledge();
            
            if (bilgiler.length === 0) {
                await message.reply('📚 Henüz hiç bilgi öğretilmemiş.\n!öğret komutu ile başlayabilirsin.');
                return;
            }

            let listeMesaji = `📚 Öğrendiğim Bilgiler (${bilgiler.length}):\n\n`;
            bilgiler.forEach((bilgi, index) => {
                listeMesaji += `${index + 1}. *${bilgi.soru}*\n   → ${bilgi.cevap}\n   🆔: ${bilgi.id}\n\n`;
            });

            // WhatsApp mesaj sınırı için bölme
            if (listeMesaji.length > 4000) {
                listeMesaji = listeMesaji.substring(0, 4000) + '\n\n...devamı var';
            }

            await message.reply(listeMesaji);
        }

        // !sil komutu
        else if (messageBody.startsWith('!sil')) {
            const id = messageBody.replace('!sil', '').trim();
            
            if (!id) {
                await message.reply('❌ Format: !sil <ID>\nID\'yi !liste komutu ile görebilirsin.');
                return;
            }

            const success = await memoryManager.deleteKnowledge(id);
            
            if (success) {
                await message.reply(`✅ ${id} ID'li bilgi silindi.`);
            } else {
                await message.reply('❌ Bilgi bulunamadı veya silinemedi!');
            }
        }

        // !ara komutu
        else if (messageBody.startsWith('!ara')) {
            const keyword = messageBody.replace('!ara', '').trim();
            
            if (!keyword) {
                await message.reply('❌ Format: !ara <kelime>');
                return;
            }

            const sonuclar = memoryManager.searchKnowledge(keyword);
            
            if (sonuclar.length === 0) {
                await message.reply(`🔍 "${keyword}" ile ilgili bilgi bulunamadı.`);
                return;
            }

            let aramaMesaji = `🔍 "${keyword}" Araması (${sonuclar.length} sonuç):\n\n`;
            sonuclar.forEach((bilgi, index) => {
                aramaMesaji += `${index + 1}. *${bilgi.soru}*\n   → ${bilgi.cevap}\n   🆔: ${bilgi.id}\n\n`;
            });

            await message.reply(aramaMesaji);
        }

        // !oto-durum komutu - OTOMATİK ÖĞRENME DURUMU
        else if (messageBody === '!oto-durum') {
            try {
                const AutoLearningManager = require('../modules/autoLearning/autoLearningManager');
                const autoLearning = new AutoLearningManager();
                
                const status = await autoLearning.getLearningStatus();
                const allKnowledge = memoryManager.listKnowledge();
                
                let statusMessage = `🤖 *OTO ÖĞRENME DURUMU*\n\n`;
                statusMessage += `📊 Toplam Bilgi: ${allKnowledge.length}\n`;
                statusMessage += `🔄 İşlem Durumu: ${status.isProcessing ? 'Çalışıyor ⏳' : 'Boşta ✅'}\n`;
                statusMessage += `💾 Bellek Kullanımı: ${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)}MB\n\n`;
                
                statusMessage += `*Kullanım:*\n`;
                statusMessage += `!web-öğret <url> - Web sitesinden öğren\n`;
                statusMessage += `!pdf-öğret - PDF dosyasından öğren\n`;
                statusMessage += `!word-öğret - Word dosyasından öğren\n`;
                statusMessage += `!öğret soru::cevap - Manuel öğret\n`;
                statusMessage += `!liste - Tüm bilgileri listele`;

                await message.reply(statusMessage);
                
            } catch (error) {
                await message.reply(`❌ Durum kontrol hatası: ${error.message}`);
            }
        }

        // !temizle komutu - BELLEK TEMİZLEME
        else if (messageBody === '!temizle') {
            try {
                // Tüm bilgileri al
                const allKnowledge = memoryManager.listKnowledge();
                
                if (allKnowledge.length === 0) {
                    await message.reply('📭 Zaten hiç bilgi yok!');
                    return;
                }

                // Onay için bekliyoruz
                await message.reply(
                    `⚠️ *TÜM BİLGİLER SİLİNECEK!*\n\n` +
                    `Toplam: ${allKnowledge.length} bilgi\n\n` +
                    `Onaylıyor musunuz? (evet/hayır)`
                );

                // Kullanıcı cevabını beklemek için session oluştur
                const sessionManager = require('../modules/sessionManager');
                sessionManager.updateUserSession(message.from, {
                    waitingForConfirmation: 'clear_memory',
                    confirmationData: { count: allKnowledge.length }
                });
                
            } catch (error) {
                await message.reply(`❌ Temizleme hatası: ${error.message}`);
            }
        }

        // !yardım komutu - GÜNCELLENDİ
        else if (messageBody === '!yardım' || messageBody === '!help') {
            const helpMessage = `🤖 *ARYA Admin Komutları*:

*📚 MANUEL ÖĞRENME:*
!öğret soru::cevap - Yeni bilgi öğret
!liste - Tüm bilgileri listele  
!sil <ID> - Bilgi sil
!ara <kelime> - Bilgilerde ara

*🌐 OTOMATİK ÖĞRENME:*
!web-öğret <url> - Web sitesinden öğren
!pdf-öğret - PDF dosyasından öğren (dosya ekle)
!word-öğret - Word dosyasından öğren (dosya ekle)
!oto-durum - Öğrenme durumunu gör

*⚙️ SİSTEM:*
!temizle - Tüm bilgileri temizle
!yardım - Bu mesajı göster

*Örnekler:*
!öğret kargo süresi::2 iş günü
!web-öğret https://firma.com/bilgiler
!pdf-öğret (PDF dosyası ekleyin)
!sil 1705320000000
!ara kargo`;

            await message.reply(helpMessage);
        }

        // ONAY BEKLEYEN İŞLEMLER
        else {
            const session = require('../modules/sessionManager').getUserSession(message.from);
            
            if (session.waitingForConfirmation === 'clear_memory' && messageBody.toLowerCase() === 'evet') {
                // Tüm bilgileri sil
                const allKnowledge = memoryManager.listKnowledge();
                
                // Her bilgiyi teker teker sil
                let deletedCount = 0;
                for (const bilgi of allKnowledge) {
                    const success = await memoryManager.deleteKnowledge(bilgi.id);
                    if (success) deletedCount++;
                }
                
                await message.reply(`✅ ${deletedCount} bilgi silindi!`);
                
                // Session'ı temizle
                require('../modules/sessionManager').updateUserSession(message.from, {
                    waitingForConfirmation: null,
                    confirmationData: null
                });
                
            } else if (session.waitingForConfirmation === 'clear_memory' && messageBody.toLowerCase() === 'hayır') {
                await message.reply('✅ İşlem iptal edildi.');
                
                // Session'ı temizle
                require('../modules/sessionManager').updateUserSession(message.from, {
                    waitingForConfirmation: null,
                    confirmationData: null
                });
            }
        }

    } catch (error) {
        console.error('❌ Admin komut hatası:', error);
        await message.reply('❌ Bir hata oluştu!');
    }
};
