/**
 * ============================================
 * WATER RECORD APP - Main Application
 * ============================================
 */

// ============================================
// Theme Management
// ============================================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  // update toggle button icon
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = next === 'dark' ? '☀️' : '🌙';
}
initTheme();

// ============================================
// App Initialization
// ============================================
async function initApp() {
  console.log('Initializing Water Record App...');
  
  // Check if username is set
  const username = Storage.get('username');
  
  if (!username) {
    // Show username setup
    showUsernameSetup();
  } else {
    // Show main app
    showMainApp(username);
    
    // Initialize database
    await initDatabase();
    
    // Check pending sync
    await checkPendingSync();
  }
}

// ============================================
// Username Setup
// ============================================
function showUsernameSetup() {
  const setupContainer = document.getElementById('setupContainer');
  const appContainer = document.getElementById('appContainer');
  
  if (setupContainer) setupContainer.style.display = 'block';
  if (appContainer) appContainer.style.display = 'none';
  
  // Focus on input with slight delay for animation
  setTimeout(() => {
    const input = document.getElementById('usernameInput');
    if (input) {
      input.focus();
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          saveUsername();
        }
      });
    }
  }, 100);
}

function saveUsername() {
  const input = document.getElementById('usernameInput');
  const username = input?.value?.trim();
  
  if (!username) {
    UI.showToast('กรุณากรอกชื่อผู้ใช้งาน', 'warning');
    input?.focus();
    return;
  }
  
  // Save username
  Storage.set('username', username);
  
  // Log
  console.log('Username saved:', username);
  
  // Show main app
  showMainApp(username);
  
  // Initialize database
  initDatabase().then(() => {
    UI.showToast(`ยินดีต้อนรับ ${username}!`, 'success');
  });
}

function showMainApp(username) {
  const setupContainer = document.getElementById('setupContainer');
  const appContainer = document.getElementById('appContainer');
  
  if (setupContainer) setupContainer.style.display = 'none';
  if (appContainer) appContainer.style.display = 'flex';
  
  // Update username display
  const usernameDisplay = document.getElementById('usernameDisplay');
  if (usernameDisplay) {
    usernameDisplay.textContent = username;
  }
  
  // Auto-pull master data and sync running numbers on startup
  setTimeout(async () => {
    await autoInitializeData();
  }, 500);
}

// ============================================
// Auto-Initialize Data on Startup
// ============================================
async function autoInitializeData() {
  console.log('Auto-initializing data...');
  
  try {
    // Check if master data exists
    const masterData = await waterDB.getAll('masterData');
    
    if (masterData.length === 0) {
      console.log('No master data, pulling from Google Sheets...');
      await pullMasterData();
    } else {
      console.log('Master data exists, syncing running numbers...');
      // Sync running numbers from Google Sheets
      await syncRunningNumbersFromSheet();
    }
  } catch (error) {
    console.error('Auto-initialization error:', error);
  }
}

// ============================================
// Cleanup on Page Close
// ============================================
window.addEventListener('beforeunload', async (event) => {
  // Check if this is the last tab/window
  const tabCount = parseInt(sessionStorage.getItem('tabCount') || '1');
  
  if (tabCount <= 1) {
    // Last window closing, stop server
    try {
      // Send signal to stop server
      fetch('http://localhost:8000/__stop__', { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.log('Could not stop server automatically');
    }
  }
});

// Track number of tabs/windows
window.addEventListener('load', () => {
  let tabCount = parseInt(sessionStorage.getItem('tabCount') || '0');
  tabCount++;
  sessionStorage.setItem('tabCount', tabCount.toString());
});

// ============================================
// Page Load Handler
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Check if this is the index/home page (has setupContainer)
  const setupContainer = document.getElementById('setupContainer');
  const appContainer = document.getElementById('appContainer');
  
  if (setupContainer && appContainer) {
    // This is index.html - run initApp
    console.log('Water Record System v1.0.0 loaded');
    initApp();
  } else {
    // Sub-pages - just update username display
    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) {
      const username = Storage.get('username');
      if (username) {
        usernameDisplay.textContent = username;
      }
    }
  }
});
