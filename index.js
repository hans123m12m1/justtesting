import { extension_settings, getContext } from "../../../scripts/shared.js";

// --- CONFIGURATION ---
const CONFIG = {
    selectors: {
        chatContainer: '#chat-log',
        message: '.message',
        attachment: '.attachment-preview',
        aiMessage: '.ai-message'
    },
    delays: {
        processMessages: 150,
        retryObserver: 500,
        debounce: 100
    },
    limits: {
        maxHistoryCheck: 10 // Limit how far back we check for attachments
    }
};

// --- EXTENSION STATE ---
const SETTINGS_KEY = 'attachment_remover_settings';
const DEFAULT_SETTINGS = { 
    enabled: false,
    removeFromAllUserMessages: false, // Option to remove from all user messages or just the most recent
    debugMode: false
};

let settings = { ...DEFAULT_SETTINGS };
let observer = null;
let isProcessing = false;
let debounceTimer = null;

// --- UTILITY FUNCTIONS ---
function log(message, level = 'info') {
    if (!settings.debugMode && level === 'debug') return;
    const prefix = '[Attachment Remover]';
    console[level](`${prefix} ${message}`);
}

function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

function safeQuerySelector(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (error) {
        log(`Invalid selector "${selector}": ${error.message}`, 'error');
        return null;
    }
}

function safeQuerySelectorAll(selector, parent = document) {
    try {
        return parent.querySelectorAll(selector);
    } catch (error) {
        log(`Invalid selector "${selector}": ${error.message}`, 'error');
        return [];
    }
}

// --- CORE LOGIC ---
function removeAttachmentsFromMessage(message) {
    const attachments = safeQuerySelectorAll(CONFIG.selectors.attachment, message);
    let removedCount = 0;
    
    attachments.forEach(attachment => {
        try {
            log(`Removing attachment: ${attachment.outerHTML.substring(0, 100)}...`, 'debug');
            attachment.remove();
            removedCount++;
        } catch (error) {
            log(`Failed to remove attachment: ${error.message}`, 'error');
        }
    });
    
    return removedCount;
}

function isAIMessage(message) {
    return message.matches(CONFIG.selectors.aiMessage);
}

function processNewMessages() {
    if (!settings.enabled || isProcessing) {
        log('Processing skipped - disabled or already processing', 'debug');
        return;
    }

    isProcessing = true;
    
    try {
        const chatContainer = safeQuerySelector(CONFIG.selectors.chatContainer);
        if (!chatContainer) {
            log('Chat container not found', 'debug');
            return;
        }

        const messages = Array.from(safeQuerySelectorAll(CONFIG.selectors.message, chatContainer));
        if (messages.length < 2) {
            log('Not enough messages to process', 'debug');
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!isAIMessage(lastMessage)) {
            log('Last message is not from AI', 'debug');
            return;
        }

        log('AI response detected. Checking for attachments to remove...');

        let totalRemoved = 0;
        const maxCheck = Math.min(messages.length - 1, CONFIG.limits.maxHistoryCheck);

        // Work backwards from the second-to-last message
        for (let i = messages.length - 2; i >= Math.max(0, messages.length - 1 - maxCheck); i--) {
            const userMessage = messages[i];
            
            // Stop if we hit another AI message (conversation boundary)
            if (isAIMessage(userMessage)) {
                log('Hit previous AI message, stopping scan', 'debug');
                break;
            }

            const removedCount = removeAttachmentsFromMessage(userMessage);
            totalRemoved += removedCount;

            if (removedCount > 0) {
                log(`Removed ${removedCount} attachment(s) from user message`);
                
                // If we only want to remove from the most recent user message, stop here
                if (!settings.removeFromAllUserMessages) {
                    break;
                }
            }
        }

        if (totalRemoved > 0) {
            log(`Total attachments removed: ${totalRemoved}`);
        }

    } catch (error) {
        log(`Error processing messages: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
    }
}

// --- DOM OBSERVER ---
const debouncedProcessMessages = debounce(processNewMessages, CONFIG.delays.debounce);

function createObserver() {
    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver(mutations => {
        let shouldProcess = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any added nodes are messages
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.matches(CONFIG.selectors.message) || 
                         node.querySelector(CONFIG.selectors.message))) {
                        shouldProcess = true;
                        break;
                    }
                }
            }
            if (shouldProcess) break;
        }

        if (shouldProcess) {
            log('DOM changes detected, scheduling message processing', 'debug');
            setTimeout(debouncedProcessMessages, CONFIG.delays.processMessages);
        }
    });

    return observer;
}

function startObserver() {
    const chatContainer = safeQuerySelector(CONFIG.selectors.chatContainer);
    
    if (chatContainer) {
        createObserver();
        observer.observe(chatContainer, { 
            childList: true, 
            subtree: true 
        });
        log('Observer started successfully');
        return true;
    } else {
        log('Chat container not found, retrying...', 'debug');
        setTimeout(startObserver, CONFIG.delays.retryObserver);
        return false;
    }
}

function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
        log('Observer stopped');
    }
}

// --- SETTINGS MANAGEMENT ---
function saveSettings() {
    try {
        extension_settings[SETTINGS_KEY] = { ...settings };
        log(`Settings saved: ${JSON.stringify(settings)}`, 'debug');
    } catch (error) {
        log(`Failed to save settings: ${error.message}`, 'error');
    }
}

function loadSettings() {
    try {
        const savedSettings = extension_settings[SETTINGS_KEY];
        if (savedSettings && typeof savedSettings === 'object') {
            settings = { ...DEFAULT_SETTINGS, ...savedSettings };
            log(`Settings loaded: ${JSON.stringify(settings)}`, 'debug');
        }
    } catch (error) {
        log(`Failed to load settings: ${error.message}`, 'error');
        settings = { ...DEFAULT_SETTINGS };
    }
}

function onSettingsChange() {
    try {
        const enabledCheckbox = document.getElementById('attachment_remover_enable');
        const allMessagesCheckbox = document.getElementById('attachment_remover_all_messages');
        const debugCheckbox = document.getElementById('attachment_remover_debug');

        if (enabledCheckbox) {
            settings.enabled = enabledCheckbox.checked;
            
            // Start/stop observer based on enabled state
            if (settings.enabled) {
                startObserver();
            } else {
                stopObserver();
            }
        }

        if (allMessagesCheckbox) {
            settings.removeFromAllUserMessages = allMessagesCheckbox.checked;
        }

        if (debugCheckbox) {
            settings.debugMode = debugCheckbox.checked;
        }

        saveSettings();
        log(`Settings updated - Enabled: ${settings.enabled}, All Messages: ${settings.removeFromAllUserMessages}, Debug: ${settings.debugMode}`);
        
    } catch (error) {
        log(`Error updating settings: ${error.message}`, 'error');
    }
}

// --- SETTINGS UI ---
function onSettingsDivRender(div) {
    const context = getContext();
    const settingsHtmlPath = `extensions/attachment_remover/settings.html`;
    const settingsCssPath = `extensions/attachment_remover/styles.css`;

    // Load CSS with error handling
    const existingLink = document.querySelector(`link[href="${settingsCssPath}"]`);
    if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = settingsCssPath;
        link.onerror = () => log('Failed to load CSS file', 'error');
        document.head.appendChild(link);
    }

    // Load HTML with better error handling
    fetch(settingsHtmlPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            div.innerHTML = html;
            
            // Connect UI elements with null checks
            const enabledCheckbox = document.getElementById('attachment_remover_enable');
            const allMessagesCheckbox = document.getElementById('attachment_remover_all_messages');
            const debugCheckbox = document.getElementById('attachment_remover_debug');

            if (enabledCheckbox) {
                enabledCheckbox.checked = settings.enabled;
                enabledCheckbox.addEventListener('change', onSettingsChange);
            }

            if (allMessagesCheckbox) {
                allMessagesCheckbox.checked = settings.removeFromAllUserMessages;
                allMessagesCheckbox.addEventListener('change', onSettingsChange);
            }

            if (debugCheckbox) {
                debugCheckbox.checked = settings.debugMode;
                debugCheckbox.addEventListener('change', onSettingsChange);
            }

            log('Settings UI loaded successfully');
        })
        .catch(error => {
            log(`Failed to load settings HTML: ${error.message}`, 'error');
            div.innerHTML = `
                <div class="attachment-remover-error">
                    <h4>Attachment Remover Settings</h4>
                    <p>Error loading settings interface: ${error.message}</p>
                    <p>Please check that the settings.html file exists in the extension directory.</p>
                </div>
            `;
        });
}

// --- CLEANUP ---
function cleanup() {
    stopObserver();
    clearTimeout(debounceTimer);
    log('Extension cleaned up');
}

// --- INITIALIZATION ---
(function() {
    try {
        // Load settings first
        loadSettings();

        // Register settings UI renderer
        this.onSettingsDivRender = onSettingsDivRender;

        // Start observer if enabled
        if (settings.enabled) {
            startObserver();
        }

        // Register cleanup for page unload
        window.addEventListener('beforeunload', cleanup);

        log('Extension initialized successfully');
        
    } catch (error) {
        log(`Initialization failed: ${error.message}`, 'error');
    }
}).call(this);