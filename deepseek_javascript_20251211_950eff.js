// Background service worker for DigiSkills AI Assistant
console.log('Background script loaded');

let messageQueue = [];
let isProcessing = false;

// Initialize when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  setupAlarms();
});

// Setup alarms for periodic checking
function setupAlarms() {
  chrome.alarms.create('checkMessages', { periodInMinutes: 5 });
}

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkMessages') {
    checkAndProcessQueue();
  }
});

// Process message queue based on size
async function checkAndProcessQueue() {
  if (isProcessing || messageQueue.length === 0) return;
  
  isProcessing = true;
  
  const queueSize = messageQueue.length;
  let delayMinutes = 15; // Default for <10 messages
  
  if (queueSize > 50) {
    delayMinutes = 300; // 5 hours = 300 minutes
  } else if (queueSize > 20) {
    delayMinutes = 120; // 2 hours = 120 minutes
  } else if (queueSize > 10) {
    delayMinutes = 60; // 1 hour = 60 minutes
  }
  
  console.log(`Processing ${queueSize} messages in ${delayMinutes} minutes`);
  
  // Simulate delay
  setTimeout(async () => {
    await processMessages();
    isProcessing = false;
    
    // Send notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'DigiSkills AI Assistant',
      message: `Processed ${queueSize} student messages`
    });
  }, delayMinutes * 60 * 1000);
}

// Process all messages in queue
async function processMessages() {
  for (const message of messageQueue) {
    try {
      const response = await generateAIResponse(message);
      console.log('Generated response:', response);
      // In real implementation, send back to content script
    } catch (error) {
      console.error('Error:', error);
    }
  }
  messageQueue = [];
}

// Generate AI response
async function generateAIResponse(messageData) {
  const { studentName, studentMessage } = messageData;
  
  // Get API key from storage
  const result = await chrome.storage.sync.get(['apiKey']);
  const apiKey = result.apiKey;
  
  if (!apiKey) {
    return "Please set your OpenAI API key in extension settings.";
  }
  
  const prompt = `You are a teaching assistant for DigiSkills LMS.
Student Name: ${studentName}
Student Message: "${studentMessage}"

Instructions:
1. Start with "Dear ${studentName.split(' ')[0]},"
2. If student says "Salam", "Aoa", "Assalam o alaikum", reply with "Wa alaikum as salam"
3. If question is in Urdu, reply in English
4. All responses must be in English
5. Keep responses concise and humanized
6. Be helpful and professional

Generate response:`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful teaching assistant for DigiSkills Pakistan LMS.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('API Error:', error);
    return `Hello ${studentName.split(' ')[0]}, I apologize but I'm unable to generate a response at the moment. Please try again later.`;
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'queueMessage') {
    messageQueue.push(request.data);
    sendResponse({ success: true, queueSize: messageQueue.length });
    
    if (!isProcessing) {
      checkAndProcessQueue();
    }
  }
  
  if (request.action === 'getQueueStatus') {
    sendResponse({
      queueSize: messageQueue.length,
      isProcessing,
      estimatedTime: calculateEstimatedTime()
    });
  }
  
  return true;
});

function calculateEstimatedTime() {
  const queueSize = messageQueue.length;
  if (queueSize === 0) return 'No messages';
  if (queueSize < 10) return '15 minutes';
  if (queueSize <= 20) return '1 hour';
  if (queueSize <= 50) return '2 hours';
  return '5 hours';
}