const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

    // YENİ: GitHub'a otomatik commit ve push - TAM ÇÖZÜM
    async commitToGitHub(commitMessage) {
        return new Promise((resolve, reject) => {
            // GitHub token kontrolü
            if (!process.env.GITHUB_TOKEN) {
                console.log('❌ GITHUB_TOKEN bulunamadı - Render Environment Variables kontrol et');
                resolve(false);
                return;
            }

            // Token ile doğrudan authentication
            const repoUrl = `https://${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_USERNAME || 'me4362'}/${process.env.REPO_NAME || 'Arya'}.git`;

            const commands = [
                `cd ${process.cwd()}`,
                `git config user.email "arya-bot@planbglobal.com"`,
                `git config user.name "ARYA Bot"`,
                `git add -f memory/knowledge.json`,  // -f flag: .gitignore'u bypass et
                `git commit -m "${commitMessage}"`,
                `git push ${repoUrl} master --force`  // MASTER yap
            ].join(' && ');

            console.log('🔧 GitHub commit deneniyor...');
            
            exec(commands, (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ GitHub commit hatası:', error.message);
                    console.log('🔍 Hata detayı:', stderr);
                    resolve(false);
                } else {
                    console.log('✅ GitHub\'a commit başarılı!');
                    resolve(true);
                }
            });
        });
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

    // Yeni bilgi ekle - GÜNCELLENDİ (GitHub commit eklendi)
    async addKnowledge(soru, cevap) {
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
        
        if (success) {
            // YENİ: GitHub'a otomatik kaydet
            console.log('🚀 GitHub commit başlatılıyor...');
            this.commitToGitHub(`ARYA öğrendi: ${soru.substring(0, 30)}...`)
                .then(success => {
                    if (success) {
                        console.log('📚 Bilgi GitHub\'a kaydedildi');
                    } else {
                        console.log('⚠️ Bilgi GitHub\'a kaydedilemedi (localde kayıtlı)');
                    }
                })
                .catch(err => {
                    console.log('⚠️ GitHub kayıt hatası:', err.message);
                });
        }
        
        return success ? yeniBilgi : null;
    }

    // Tüm bilgileri listele
    listKnowledge() {
        return this.loadKnowledge().bilgiler;
    }

    // ID'ye göre bilgi sil - GÜNCELLENDİ (GitHub commit eklendi)
    async deleteKnowledge(id) {
        const knowledge = this.loadKnowledge();
        const initialLength = knowledge.bilgiler.length;
        
        const silinenBilgi = knowledge.bilgiler.find(bilgi => bilgi.id == id);
        knowledge.bilgiler = knowledge.bilgiler.filter(bilgi => bilgi.id != id);
        
        if (knowledge.bilgiler.length < initialLength) {
            const success = this.saveKnowledge(knowledge);
            
            if (success && silinenBilgi) {
                // YENİ: GitHub'a silme işlemini kaydet
                this.commitToGitHub(`ARYA sildi: ${silinenBilgi.soru.substring(0, 30)}...`)
                    .then(success => {
                        if (success) {
                            console.log('🗑️ Silme işlemi GitHub\'a kaydedildi');
                        }
                    });
            }
            
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

