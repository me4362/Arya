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

module.exports = async (message, client) => {
    const phoneNumber = message.from;
    const messageBody = message.body;
    
    // Admin kontrolü
    if (!isAdmin(phoneNumber)) {
        return; // Admin değilse işlem yapma
    }

    const memoryManager = new MemoryManager();

    try {
        // !öğret komutu
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

            // DÜZELTME: await eklendi
            const result = await memoryManager.addKnowledge(soru, cevap);
            
            if (result) {
                await message.reply(`✅ Öğrendim! \n*Soru:* ${soru}\n*Cevap:* ${cevap}\n\nAnahtar kelimeler: ${result.anahtar_kelimeler.join(', ')}`);
            } else {
                await message.reply('❌ Bilgi kaydedilemedi!');
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

            // DÜZELTME: await eklendi
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

        // !yardım komutu
        else if (messageBody === '!yardım' || messageBody === '!help') {
            const helpMessage = `🤖 *ARYA Admin Komutları*:

!öğret soru::cevap - Yeni bilgi öğret
!liste - Tüm bilgileri listele  
!sil <ID> - Bilgi sil
!ara <kelime> - Bilgilerde ara
!yardım - Bu mesajı göster

*Örnek:*
!öğret kargo süresi::2 iş günü
!sil 1705320000000
!ara kargo`;

            await message.reply(helpMessage);
        }

    } catch (error) {
        console.error('❌ Admin komut hatası:', error);
        await message.reply('❌ Bir hata oluştu!');
    }
};