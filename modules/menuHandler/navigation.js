// modules/menuHandler/navigation.js
const logger = require('../logger');
const sessionManager = require('../sessionManager');

// Ana menüye dön
async function returnToMainMenu(message, services, contactName = '') {
  console.log(`🏠 Ana menüye dönülüyor`);
  
  sessionManager.updateUserSession(message.from, { 
    currentState: 'main_menu',
    currentService: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    collectedAnswers: {}
  });
  
  const mainMenu = require('./mainMenu');
  
  if (contactName) {
    await message.reply(`👋 ${contactName}, ana menüye döndünüz!`);
  }
  
  await mainMenu.showMainMenu(message, services);
}

// Önceki menüye dön
async function goBackToPreviousMenu(message, services, currentState) {
  console.log(`↩️ Önceki menüye dönülüyor: ${currentState}`);
  
  if (currentState.startsWith('submenu_')) {
    const categoryName = currentState.replace('submenu_', '');
    const categoryManager = require('./categoryManager');
    const subMenu = require('./subMenu');
    
    const categoryData = categoryManager.loadCategoryData(categoryName, services);
    if (categoryData) {
      await subMenu.showCategoryOptions(message, { data: categoryData, name: categoryName }, services);
      return;
    }
  }
  
  // Önceki menü bulunamazsa ana menüye dön
  await returnToMainMenu(message, services);
}

// Menü geçmişini yönet
function updateMenuHistory(userId, newState) {
  const session = sessionManager.getUserSession(userId);
  const history = session.menuHistory || [];
  
  // Son state'i history'e ekle (tekrarları önle)
  if (history.length === 0 || history[history.length - 1] !== session.currentState) {
    history.push(session.currentState);
  }
  
  // History'yi sınırla (max 10)
  if (history.length > 10) {
    history.shift();
  }
  
  sessionManager.updateUserSession(userId, { 
    menuHistory: history,
    currentState: newState
  });
  
  return history;
}

// Menü durumunu kontrol et
function getMenuStateInfo(userId) {
  const session = sessionManager.getUserSession(userId);
  if (!session) return null;
  
  return {
    currentState: session.currentState,
    menuHistory: session.menuHistory || [],
    inService: session.currentService !== null,
    waitingForResponse: session.waitingForResponse || false
  };
}

// Menü zaman aşımını kontrol et
function checkMenuTimeout(userId) {
  const session = sessionManager.getUserSession(userId);
  if (!session || !session.lastActivity) return false;
  
  const timeoutDuration = 10 * 60 * 1000; // 10 dakika
  const timeSinceLastActivity = Date.now() - session.lastActivity;
  
  return timeSinceLastActivity > timeoutDuration;
}

module.exports = {
  returnToMainMenu,
  goBackToPreviousMenu,
  updateMenuHistory,
  getMenuStateInfo,
  checkMenuTimeout
};