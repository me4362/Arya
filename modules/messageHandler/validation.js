const logger = require('../logger');

function validateMessage(message) {
  // Temel validasyonlar
  if (message.fromMe) {
    return { isValid: false, reason: 'fromMe' };
  }
  
  if (message.from === 'status@broadcast') {
    return { isValid: false, reason: 'status_broadcast' };
  }
  
  if (message.isGroupMsg) {
    return { isValid: false, reason: 'group_message' };
  }
  
  const messageBody = message.body?.toLowerCase().trim();
  if (!messageBody || messageBody.length === 0) {
    return { isValid: false, reason: 'empty_message' };
  }
  
  if (message.hasMedia) {
    return { isValid: false, reason: 'has_media' };
  }
  
  return { isValid: true, messageBody };
}

function validateInput(message, expectedType) {
  const cleanMessage = message.trim();
  
  switch (expectedType) {
    case 'number':
      const number = parseInt(cleanMessage);
      if (isNaN(number)) {
        return {
          isValid: false,
          errorMessage: 'Geçersiz sayı formatı. Lütfen sadece rakam girin.'
        };
      }
      return { isValid: true, value: number };
      
    case 'text':
      if (cleanMessage.length < 2) {
        return {
          isValid: false,
          errorMessage: 'Cevap çok kısa. Lütfen daha detaylı bilgi verin.'
        };
      }
      return { isValid: true, value: cleanMessage };
      
    default:
      return { isValid: true, value: cleanMessage };
  }
}

module.exports = {
  validateMessage,
  validateInput
};