// modules/messageHandler/contactManager.js
const logger = require('../logger');

async function getContactInfo(message) {
  try {
    const contact = await message.getContact();
    const contactName = contact.name || contact.pushname || '';
    const phoneNumber = contact.id.user || '';
    
    console.log(`👤 Müşteri bilgisi: ${contactName} (${phoneNumber})`);
    
    return {
      name: contactName,
      phone: phoneNumber,
      isBusiness: contact.isBusiness || false,
      isEnterprise: contact.isEnterprise || false
    };
  } catch (contactError) {
    logger.error(`Müşteri bilgisi alınamadı: ${contactError.message}`);
    console.log('⚠️  Müşteri bilgisi alınamadı:', contactError.message);
    
    return {
      name: '',
      phone: '',
      isBusiness: false,
      isEnterprise: false
    };
  }
}

// logContactInteraction fonksiyonunu ekliyoruz
async function logContactInteraction(message, action) {
  const contactInfo = await getContactInfo(message);
  
  logger.info(`📞 ${action} - Müşteri: ${contactInfo.name} (${contactInfo.phone}) - Mesaj: "${message.body}"`);
  
  return contactInfo;
}

module.exports = {
  getContactInfo,
  logContactInteraction  // Bu fonksiyonu ekledik
};