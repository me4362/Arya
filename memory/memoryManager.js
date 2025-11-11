const fs = require('fs');
const path = require('path');

class MemoryManager {
    constructor() {
        this.knowledgeFile = path.join(__dirname, 'knowledge.json');
        this.ensureKnowledgeFileExists();
    }

    // knowledge.json dosyasını oluştur (yoksa)
    ensureKnowledgeFileExists() {
        if (!fs.existsSync(this.knowledgeFile)) {
            const initialData = {
                "bilgiler": []
            };
            fs.writeFileSync(this.knowledgeFile, JSON.stringify(initialData, null, 2));
            console.log('✅ knowledge.json dosyası oluşturuldu');
        }
    }

    // JSON dosyasını oku
    loadKnowledge() {
        try {
            const data = fs.readFileSync(this.knowledgeFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ knowledge.json okunamadı:', error);
            return { "bilgiler": [] };
        }
    }

    // JSON dosyasını kaydet
    saveKnowledge(knowledge) {
        try {
            fs.writeFileSync(this.knowledgeFile, JSON.stringify(knowledge, null, 2));
            return true;
        } catch (error) {
            console.error('❌ knowledge.json kaydedilemedi:', error);
            return false;
        }
    }

    // Yeni bilgi ekle
    addKnowledge(soru, cevap) {
        const knowledge = this.loadKnowledge();
        
        const yeniBilgi = {
            "soru": soru,
            "cevap": cevap,
            "anahtar_kelimeler": this.extractKeywords(soru),
            "eklenme_tarihi": new Date().toISOString(),
            "id": Date.now() // Benzersiz ID
        };

        knowledge.bilgiler.push(yeniBilgi);
        const success = this.saveKnowledge(knowledge);
        
        return success ? yeniBilgi : null;
    }

    // Tüm bilgileri listele
    listKnowledge() {
        return this.loadKnowledge().bilgiler;
    }

    // ID'ye göre bilgi sil
    deleteKnowledge(id) {
        const knowledge = this.loadKnowledge();
        const initialLength = knowledge.bilgiler.length;
        
        knowledge.bilgiler = knowledge.bilgiler.filter(bilgi => bilgi.id != id);
        
        if (knowledge.bilgiler.length < initialLength) {
            this.saveKnowledge(knowledge);
            return true; // Silme başarılı
        }
        return false; // Bilgi bulunamadı
    }

    // Anahtar kelimeleri çıkar
    extractKeywords(soru) {
        const stopWords = ['nedir', 'nasıl', 'nerede', 'ne', 'mi', 'mı', 'var', 'mu', 'acaba', 'lütfen'];
        const words = soru.toLowerCase()
            .replace(/[^\w\s]/gi, '') // Noktalama işaretlerini kaldır
            .split(' ')
            .filter(word => word.length > 2 && !stopWords.includes(word));
        
        return [...new Set(words)]; // Tekrarları kaldır
    }

    // Kelimeye göre ara
    searchKnowledge(keyword) {
        const knowledge = this.loadKnowledge();
        keyword = keyword.toLowerCase();
        
        return knowledge.bilgiler.filter(bilgi => 
            bilgi.soru.toLowerCase().includes(keyword) ||
            bilgi.cevap.toLowerCase().includes(keyword) ||
            bilgi.anahtar_kelimeler.some(kelime => kelime.includes(keyword))
        );
    }
}

module.exports = MemoryManager;
