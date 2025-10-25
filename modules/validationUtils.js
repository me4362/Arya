// Cevap doğrulama
function validateAnswer(answer, fieldType) {
  const cleanAnswer = answer.trim();
  
  switch (fieldType) {
    case 'number':
      const number = parseInt(cleanAnswer);
      if (isNaN(number)) {
        return {
          isValid: false,
          errorMessage: 'Geçersiz sayı formatı. Lütfen sadece rakam girin.'
        };
      }
      return { isValid: true, cleanedValue: number };
      
    case 'date':
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = cleanAnswer.match(dateRegex);
      if (!match) {
        return {
          isValid: false,
          errorMessage: 'Geçersiz tarih formatı. Lütfen Gün/Ay/Yıl formatında girin (Örnek: 15/01/2024).'
        };
      }
      return { isValid: true, cleanedValue: cleanAnswer };
      
    case 'phone':
      const phoneRegex = /^[5][0-9]{2}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
      const cleanPhone = cleanAnswer.replace(/\s/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return {
          isValid: false,
          errorMessage: 'Geçersiz telefon formatı. Lütfen 5XX XXX XX XX formatında girin.'
        };
      }
      return { isValid: true, cleanedValue: cleanAnswer };
      
    case 'text':
    default:
      if (cleanAnswer.length < 2) {
        return {
          isValid: false,
          errorMessage: 'Cevap çok kısa. Lütfen daha detaylı bilgi verin.'
        };
      }
      return { isValid: true, cleanedValue: cleanAnswer };
  }
}

module.exports = {
  validateAnswer
};