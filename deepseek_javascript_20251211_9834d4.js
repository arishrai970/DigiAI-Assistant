// Content Script - Runs on DigiSkills pages
console.log('DigiSkills AI Assistant content script loaded');

// Function to detect messages
function detectMessages() {
  console.log('Scanning for student messages...');
  
  // These selectors need to be adjusted based on DigiSkills actual structure
  const possibleSelectors = [
    '.forum-post',
    '.message-content',
    '.discussion-text',
    '.student-comment',
    '[class*="message"]',
    '[class*="post"]',
    '[class*="comment"]'
  ];
  
  let foundMessages = [];
  
  possibleSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!element.dataset.aiProcessed && element.textContent.trim().length > 10) {
        const message = element.textContent.trim();
        const studentName = extractStudentName(element) || 'Student';
        
        // Check if it's likely a student message (not from instructor)
        if (!isInstructorMessage(element)) {
          element.dataset.aiProcessed = 'true';
          foundMessages.push({ element, message, studentName });
        }
      }
    });
  });
  
  // Process found messages
  foundMessages.forEach(({ message, studentName }) => {
    processStudentMessage(studentName, message);
  });
}

function extractStudentName(element) {
  // Try to find student name in nearby elements
  const nameSelectors = [
    '.user-name',
    '.author-name',
    '.student-name',
    '.posted-by',
    '.user-info',
    '[class*="name"]',
    '[class*="user"]'
  ];
  
  for (let i = 0; i < 3; i++) {
    let current = element;
    for (let j = 0; j <= i; j++) {
      current = current.parentElement;
      if (!current) break;
      
      nameSelectors.forEach(selector => {
        const nameElement = current.querySelector(selector);
        if (nameElement && nameElement.textContent) {
          return nameElement.textContent.trim();
        }
      });
    }
  }
  
  return 'Student';
}

function isInstructorMessage(element) {
  const text = element.textContent.toLowerCase();
  const instructorKeywords = ['instructor', 'teacher', 'trainer', 'course lead', 'moderator'];
  return instructorKeywords.some(keyword => text.includes(keyword));
}

function processStudentMessage(studentName, message) {
  console.log('Found student message:', { studentName, message });
  
  chrome.runtime.sendMessage({
    action: 'queueMessage',
    data: {
      studentName,
      studentMessage: message,
      timestamp: new Date().toISOString(),
      url: window.location.href
    }
  }, (response) => {
    console.log('Message queued. Queue size:', response.queueSize);
    
    // Show visual indicator
    showProcessingIndicator(studentName);
  });
}

function showProcessingIndicator(studentName) {
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4f46e5;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    z-index: 9999;
    font-size: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  indicator.textContent = `Processing message from ${studentName}...`;
  document.body.appendChild(indicator);
  
  setTimeout(() => {
    indicator.remove();
  }, 3000);
}

// Initial scan after page loads
setTimeout(detectMessages, 3000);

// Scan periodically
setInterval(detectMessages, 10000);

// Also scan when user scrolls (new content might load)
let scrollTimer;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(detectMessages, 1000);
});