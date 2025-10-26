// modules/messageHandler/greetingManager.js - TAM VE DÜZELTİLMİŞ
const serviceLoader = require('../serviceLoader');
const personalization = require('./personalization');
const { sendMessageWithoutQuote } = require('../utils/globalClient');

// Alıntısız mesaj gönderme yardımcı fonksiyonu
async function sendGreetingMessage(message, text) {
  try {
    await sendMessageWithoutQuote(message.from, text);
  } catch (error) {
    console.error('Selamlama mesajı gönderme hatası, fallback kullanılıyor:', error.message);
    await message.reply(text);
  }
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) return 'gunaydin';
  if (hour >= 11 && hour < 17) return 'merhaba';
  return 'iyi_aksamlar';
}

// SAAT DİLİMİNE GÖRE VEDALAŞMA
function getTimeBasedGoodbye() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) {
    return 'İyi günler! PlanB Global Network Ltd Şti adına başarılı bir gün dilerim. 🌞';
  } else if (hour >= 11 && hour < 17) {
    return 'İyi günler! PlanB Global Network Ltd Şti adına gününüz verimli geçsin. ☀️';
  } else if (hour >= 17 && hour < 23) {
    return 'İyi akşamlar! PlanB Global Network Ltd Şti adına huzurlu bir akşam dilerim. 🌙';
  } else {
    return 'İyi geceler! PlanB Global Network Ltd Şti adına huzurlu uykular dilerim. 🌃';
  }
}

async function handleGreeting(message, services, contactName = '') {
  const greetingType = getTimeBasedGreeting();
  const greetingMsg = personalization.createPersonalizedGreeting(contactName, greetingType);
  
  // SELAMLAMA MESAJINI GÖNDER - EKSİK OLAN SATIR!
  await sendGreetingMessage(message, greetingMsg);
  
  // YENİ: 60 saniye sonra yardım sorusu için timer başlat
  const sessionManager = require('../sessionManager');
  sessionManager.startGreetingTimer(message.from, message, services);
  
  return true;
}

// Teşekkür mesajını işle
async function handleThanks(message, contactName = '') {
  const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
  const thanksResponses = greetings?.tesekkur?.tesekkur_cevaplari || [
    '🙏 Rica ederim! Size yardımcı olabildiğim için ben teşekkür ederim. 🎯'
  ];
  
  const randomThanks = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
  
  let thanksMsg = randomThanks;
  if (contactName) {
    thanksMsg = `${contactName}, ${randomThanks.toLowerCase()}`;
  }
  
  thanksMsg += `\n\nBaşka bir konuda yardıma ihtiyacınız varsa "menü" yazabilirsiniz.`;
  
  await sendGreetingMessage(message, thanksMsg);
  
  // Timer'ları temizle (etkileşim oldu)
  const sessionManager = require('../sessionManager');
  sessionManager.stopAllTimers(message.from);
  
  return true;
}

// Vedalaşma mesajını işle - YENİ: SAAT DİLİMLİ
async function handleGoodbye(message, contactName = '') {
  const goodbyeMsg = getTimeBasedGoodbye();
  
  let finalMessage = goodbyeMsg;
  if (contactName) {
    finalMessage = `${contactName}, ${goodbyeMsg.toLowerCase()}`;
  }
  
  await sendGreetingMessage(message, finalMessage);
  
  // Oturumu temizle
  const sessionManager = require('../sessionManager');
  sessionManager.updateUserSession(message.from, {
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {}
  });
  
  sessionManager.clearAllTimers(message.from);
  
  return true;
}

module.exports = {
  getTimeBasedGreeting,
  getTimeBasedGoodbye,
  handleGreeting,
  handleThanks,
  handleGoodbye
};