document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const queueCount = document.getElementById('queueCount');
  const statusText = document.getElementById('statusText');
  const estTime = document.getElementById('estTime');
  const apiKeyInput = document.getElementById('apiKey');
  const saveKeyBtn = document.getElementById('saveKey');
  const autoMode = document.getElementById('autoMode');
  const responseStyle = document.getElementById('responseStyle');
  const processBtn = document.getElementById('processBtn');
  const clearBtn = document.getElementById('clearBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  
  // Load saved settings
  loadSettings();
  
  // Update status initially
  updateStatus();
  
  // Event Listeners
  saveKeyBtn.addEventListener('click', saveApiKey);
  autoMode.addEventListener('change', saveSettings);
  responseStyle.addEventListener('change', saveSettings);
  processBtn.addEventListener('click', processNow);
  clearBtn.addEventListener('click', clearQueue);
  refreshBtn.addEventListener('click', updateStatus);
  
  // Auto-refresh every 10 seconds
  setInterval(updateStatus, 10000);
  
  // Functions
  function loadSettings() {
    chrome.storage.sync.get(['apiKey', 'autoMode', 'responseStyle'], function(data) {
      if (data.apiKey) {
        // Show last 4 characters for security
        const key = data.apiKey;
        if (key.length > 4) {
          apiKeyInput.value = '*'.repeat(key.length - 4) + key.slice(-4);
        } else {
          apiKeyInput.value = '****************';
        }
      }
      autoMode.checked = data.autoMode !== false;
      responseStyle.value = data.responseStyle || 'friendly';
    });
  }
  
  function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key && !key.includes('*')) {
      chrome.storage.sync.set({ apiKey: key }, function() {
        showNotification('API Key saved successfully!');
        // Mask the key in input
        if (key.length > 4) {
          apiKeyInput.value = '*'.repeat(key.length - 4) + key.slice(-4);
        }
      });
    } else {
      showNotification('Please enter a valid API key');
    }
  }
  
  function saveSettings() {
    chrome.storage.sync.set({
      autoMode: autoMode.checked,
      responseStyle: responseStyle.value
    }, function() {
      showNotification('Settings saved!');
    });
  }
  
  function updateStatus() {
    chrome.runtime.sendMessage({ action: 'getQueueStatus' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      
      queueCount.textContent = response.queueSize;
      statusText.textContent = response.isProcessing ? 'Processing...' : 'Idle';
      estTime.textContent = response.estimatedTime || '-';
      
      // Update button states
      processBtn.disabled = response.queueSize === 0 || response.isProcessing;
      processBtn.textContent = response.isProcessing ? 'Processing...' : 'Process Queue Now';
      
      // Update button color based on queue size
      if (response.queueSize === 0) {
        processBtn.style.opacity = '0.5';
      } else if (response.queueSize < 10) {
        processBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
      } else if (response.queueSize <= 50) {
        processBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';
      } else {
        processBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)';
      }
    });
  }
  
  function processNow() {
    chrome.runtime.sendMessage({ action: 'processNow' }, function(response) {
      showNotification('Processing started!');
      updateStatus();
    });
  }
  
  function clearQueue() {
    if (confirm('Are you sure you want to clear all queued messages?')) {
      chrome.runtime.sendMessage({ action: 'clearQueue' }, function(response) {
        showNotification('Queue cleared!');
        updateStatus();
      });
    }
  }
  
  function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }
});
