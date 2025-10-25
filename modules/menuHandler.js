// modules/menuHandler.js - ANA YÖNLENDİRİCİ DOSYA
const mainMenu = require('./menuHandler/mainMenu');
const subMenu = require('./menuHandler/subMenu');
const numberHandler = require('./menuHandler/numberHandler');
const serviceConverter = require('./menuHandler/serviceConverter');
const categoryManager = require('./menuHandler/categoryManager');
const navigation = require('./menuHandler/navigation');

// Ana menü göster
async function showMainMenu(message, services) {
  await mainMenu.showMainMenu(message, services);
}

// Sayı seçimini işle
async function handleNumberSelection(message, number, services) {
  await numberHandler.handleNumberSelection(message, number, services);
}

// Alt menü seçimini işle
async function handleSubMenuSelection(message, number, categoryName, services) {
  await subMenu.handleSubMenuSelection(message, number, categoryName, services);
}

// Kategori seçeneklerini göster
async function showCategoryOptions(message, category, services) {
  await subMenu.showCategoryOptions(message, category, services);
}

// Servis anahtarını dönüştür
function convertToServiceKey(categoryName) {
  return serviceConverter.convertToServiceKey(categoryName);
}

// Ana menüye dön
async function returnToMainMenu(message, services, contactName = '') {
  await navigation.returnToMainMenu(message, services, contactName);
}

module.exports = {
  showMainMenu,
  handleNumberSelection,
  handleSubMenuSelection,
  showCategoryOptions,
  convertToServiceKey,
  returnToMainMenu,
  
  // Alt modüllere erişim için
  mainMenu,
  subMenu,
  numberHandler,
  serviceConverter,
  categoryManager,
  navigation
};