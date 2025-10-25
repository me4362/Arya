// modules/utils/globalClient.js - GÜNCELLENDİ
let globalClient = null;

function setGlobalClient(client) {
  globalClient = client;
}

function getGlobalClient() {
  return globalClient;
}

// Alıntısız mesaj gönderme fonksiyonu ekle
async function sendMessageWithoutQuote(chatId, message) {
  if (!globalClient) {
    throw new Error('Global client başlatılmamış');
  }
  
  try {
    const chat = await globalClient.getChatById(chatId);
    await chat.sendMessage(message);
    return true;
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    throw error;
  }
}

module.exports = {
  setGlobalClient,
  getGlobalClient,
  sendMessageWithoutQuote
};