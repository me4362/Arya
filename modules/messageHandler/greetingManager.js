// modules/messageHandler/greetingManager.js - GÜNCELLENDİ
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

async function handleGreeting(message, services, contactName = '') {
  const greetingType = getTimeBasedGreeting();
  const greetingMsg = personalization.createPersonalizedGreeting(contactName, greetingType);
  
  await sendGreetingMessage(message, greetingMsg);
  
  // Hemen ardından yardım sorusunu sor
  setTimeout(async () => {
    const helpQuestion = contactName ? 
      `🤔 ${contactName}, size yardımcı olabilmem için lütfen bana hangi konuda yardım istediğinizi yazarmısınız?` :
      `🤔 Size yardımcı olabilmem için lütfen bana hangi konuda yardım istediğinizi yazarmısınız?`;
    
    await sendGreetingMessage(message, helpQuestion);
    
    const sessionManager = require('../sessionManager');
    sessionManager.startHelpTimer(message.from, message, services);
  }, 1000);
  
  return true;
}

// Teşekkür mesajını işle - GÜNCELLENDİ
async function handleThanks(message, contactName = '') {
  const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
  const thanksResponses = greetings?.tesekkur?.tesekkur_cevaplari || [
    '🙏 Rica ederim! Size yardımcı olabildiğim için ben teşekkür ederim. 🎯'
  ];
  
  // Rastgele bir teşekkür cevabı seç
  const randomThanks = thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
  
  let thanksMsg = randomThanks;
  if (contactName) {
    thanksMsg = `${contactName}, ${randomThanks.toLowerCase()}`;
  }
  
  thanksMsg += `\n\nBaşka bir konuda yardıma ihtiyacınız varsa "menü" yazabilirsiniz.`;
  
  await sendGreetingMessage(message, thanksMsg);
  return true;
}

// Vedalaşma mesajını işle - GÜNCELLENDİ
async function handleGoodbye(message, contactName = '') {
  const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
  const goodbyeResponses = greetings?.vedalasma?.hoscakal || [
    '👋 Hoşça kalın! PlanB Global Network Ltd Şti adına iyi günler dilerim.'
  ];
  
  // Rastgele bir vedalaşma mesajı seç
  const randomGoodbye = goodbyeResponses[Math.floor(Math.random() * goodbyeResponses.length)];
  
  let goodbyeMsg = randomGoodbye;
  if (contactName) {
    goodbyeMsg = `${contactName}, ${randomGoodbye}`;
  }
  
  await sendGreetingMessage(message, goodbyeMsg);
  
  // Oturumu temizle
  const sessionManager = require('../sessionManager');
  sessionManager.updateUserSession(message.from, {
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {}
  });
  
  return true;
}

module.exports = {
  getTimeBasedGreeting,
  handleGreeting,
  handleThanks,
  handleGoodbye
};