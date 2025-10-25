// modules/messageHandler/messageParser.js
const logger = require('../logger');

function parseMessage(messageBody) {
  const cleanMessage = messageBody.toLowerCase().replace(/[.,!?]/g, '').trim();
  
  let greetingPart = '';
  let servicePart = messageBody; // Varsayılan: tüm mesaj işlem kısmı
  
  const greetingWords = ['merhaba', 'selam', 'hi', 'hello', 'hey', 'günaydın', 'iyi günler', 'iyi akşamlar', 'naber', 'slm', 'sa'];
  
  // Tüm mesajı kontrol et, selamlama bulunursa ayır
  for (const word of greetingWords) {
    if (cleanMessage.includes(word)) {
      const index = cleanMessage.indexOf(word);
      greetingPart = messageBody.substring(0, index + word.length);
      servicePart = messageBody.substring(index + word.length).trim();
      break;
    }
  }
  
  console.log(`📝 Mesaj ayrıştırma: Orijinal="${messageBody}", Selamlama="${greetingPart}", İşlem="${servicePart}"`);
  
  return { 
    greetingPart, 
    servicePart, 
    cleanMessage: cleanMessage,
    originalMessage: messageBody 
  };
}

function isGreeting(message) {
  const greetings = [
    'merhaba', 'selam', 'hi', 'hello', 'hey', 
    'günaydın', 'iyi günler', 'iyi akşamlar', 
    'naber', 'slm', 'sa', 'selamun aleyküm',
    'aleyküm selam', 'merhabalar', 'selamlar',
    'good morning', 'good afternoon', 'good evening'
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return greetings.some(greet => cleanMessage.includes(greet));
}

function isThanksMessage(message) {
  const thanksWords = [
    'teşekkür', 'tesekkür', 'teşekkürler', 'tesekkurler', 'teşekkür ederim', 'tesekkur ederim',
    'sağol', 'sagol', 'sağolun', 'sagolun', 'sağ ol', 'sag ol',
    'thank you', 'thanks', 'thx', 'ty', 'thank u',
    'eyvallah', 'mersi', 'çok teşekkür', 'cok tesekkur', 'teşekkürler çok', 'tşk',
    'teşekkür ederiz', 'tesekkur ederiz', 'minnettarım', 'minnettarim'
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return thanksWords.some(word => cleanMessage.includes(word));
}

function isGoodbyeMessage(message) {
  const goodbyeWords = [
    'güle güle', 'gule gule', 'hoşça kal', 'hoscakal', 'hoşçakal', 'hoscakal', 
    'allaha ısmarladık', 'allaha ısmarladik', 'bay bay', 'bye bye', 'bye',
    'görüşürüz', 'gorusuruz', 'görüşmek üzere', 'gorusmek uzere',
    'kendine iyi bak', 'kendine iyi bak', 'iyi günler', 'iyi gunler',
    'iyi akşamlar', 'iyi aksamlar', 'iyi geceler', 'iyi geceler'
  ];
  
  const cleanMessage = message.toLowerCase().trim();
  return goodbyeWords.some(word => cleanMessage.includes(word));
}

function isNumberInput(message) {
  return /^\d+$/.test(message.trim());
}

function isMenuRequest(message) {
  const menuWords = ['menü', 'menu', 'list', 'liste', 'seçenek', 'secenek', 'options'];
  const cleanMessage = message.toLowerCase().trim();
  return menuWords.some(word => cleanMessage.includes(word));
}

function hasMedia(message) {
  return message.hasMedia;
}

function extractServiceKeywords(message) {
  const cleanMessage = message.toLowerCase().replace(/[.,!?]/g, '').trim();
  const keywords = [
    'sigorta', 'yazılım', 'siber', 'güvenlik', 'lojistik', 'nakliye',
    'ithalat', 'ihracat', 'denetim', 'emlak', 'inşaat', 'crm',
    'tekstil', 'kozmetik', 'tur', 'güneş', 'enerji', 'kurumsal',
    'danışmanlık', 'yazilim', 'saglik', 'seyahat', 'kasko', 'dask',
    'konut', 'isyeri', 'mobil', 'uygulama', 'gümrük', 'depo',
    'antrepo', 'parfüm', 'deodorant', 'ges', 'finansal', 'eğitim',
    'diğer', 'diger', 'hizmet', 'servis', 'service'
  ];
  
  return keywords.filter(keyword => cleanMessage.includes(keyword));
}

function isHelpRequest(message) {
  const helpWords = ['yardım', 'yardim', 'help', 'nasıl', 'nasil', 'ne yapabilir', 'yapabilir'];
  const cleanMessage = message.toLowerCase().trim();
  return helpWords.some(word => cleanMessage.includes(word));
}

function isCancelRequest(message) {
  const cancelWords = ['iptal', 'cancel', 'dur', 'stop', 'vazgeç', 'vazgec'];
  const cleanMessage = message.toLowerCase().trim();
  return cancelWords.some(word => cleanMessage.includes(word));
}

function isOtherServicesRequest(message) {
  const otherServiceWords = ['diğer', 'diger', 'başka', 'baska', 'farklı', 'farkli', 'öteki', 'oteki'];
  const serviceWords = ['hizmet', 'servis', 'service', 'seçenek', 'secenek'];
  
  const cleanMessage = message.toLowerCase().trim();
  
  const hasOtherWord = otherServiceWords.some(word => cleanMessage.includes(word));
  const hasServiceWord = serviceWords.some(word => cleanMessage.includes(word));
  
  return hasOtherWord && hasServiceWord;
}

function getMessageType(message) {
  const cleanMessage = message.toLowerCase().trim();
  
  if (isGreeting(cleanMessage)) return 'greeting';
  if (isNumberInput(cleanMessage)) return 'number';
  if (isMenuRequest(cleanMessage)) return 'menu';
  if (isHelpRequest(cleanMessage)) return 'help';
  if (isCancelRequest(cleanMessage)) return 'cancel';
  if (isThanksMessage(cleanMessage)) return 'thanks';
  if (isGoodbyeMessage(cleanMessage)) return 'goodbye';
  if (isOtherServicesRequest(cleanMessage)) return 'other_services';
  
  const keywords = extractServiceKeywords(cleanMessage);
  if (keywords.length > 0) return 'service_request';
  
  return 'unknown';
}

module.exports = {
  parseMessage,
  isGreeting,
  isThanksMessage,
  isGoodbyeMessage,
  isNumberInput,
  isMenuRequest,
  hasMedia,
  extractServiceKeywords,
  isHelpRequest,
  isCancelRequest,
  isOtherServicesRequest,
  getMessageType
};