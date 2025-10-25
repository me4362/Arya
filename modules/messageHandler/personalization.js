const serviceLoader = require('../serviceLoader');

function createPersonalizedGreeting(contactName, greetingType) {
  const greetings = serviceLoader.loadJSON('./genel_diyalog/selamlama_vedalasma.json');
  const baseGreeting = greetings?.selamlama?.[greetingType] || 
                      'Merhaba! Ben ARYA, PlanB Global Network Ltd Şti için hizmet veren yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?';
  
  if (contactName && contactName.trim().length > 0) {
    const personalizedGreetings = {
      gunaydin: `🌞 Günaydın ${contactName}! Ben ARYA, PlanB Global Network Ltd Şti için hizmet veren yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?`,
      merhaba: `👋 Merhaba ${contactName}! Ben ARYA, PlanB Global Network Ltd Şti için hizmet veren yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?`,
      iyi_aksamlar: `🌙 İyi akşamlar ${contactName}! Ben ARYA, PlanB Global Network Ltd Şti için hizmet veren yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?`
    };
    
    return personalizedGreetings[greetingType] || 
           `👋 Merhaba ${contactName}! Ben ARYA, PlanB Global Network Ltd Şti için hizmet veren yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?`;
  }
  
  return baseGreeting;
}

function createPersonalizedUnknownMessage(contactName) {
  const baseText = `🤔 Anlayamadım. Lütfen aşağıdaki seçeneklerden birini belirtin:`;
  
  if (contactName) {
    return `🤔 ${contactName}, anlayamadım. Lütfen aşağıdaki seçeneklerden birini belirtin:`;
  }
  
  return baseText;
}

module.exports = {
  createPersonalizedGreeting,
  createPersonalizedUnknownMessage
};