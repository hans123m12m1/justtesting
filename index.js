import { extension_settings, getContext, saveSettingsDebounced } from "../../../script.js";
import { eventSource, event_types } from "../../../script.js";

// --- EXTENSION METADATA ---
const EXTENSION_NAME = 'attachment_remover';
const EXTENSION_FOLDER_PATH = `scripts/extensions/${EXTENSION_NAME}`;

// --- CONFIGURATION ---
const CONFIG = {
    selectors: {
        // Updated selectors for modern SillyTavern versions
        chatContainer: '#chat',
        message: '.mes',
        userMessage: '.mes[ch_name="user"], .mes[is_user="true"]',
        aiMessage: '.mes[ch_name!="user"]:not([is_user="true"])',
        attachment: '.mes_img, .attachment_holder, .mes_file, .inline_image, img[src*="user_uploads"]',
        messageText: '.mes_text'
    },
    delays: {
        processMessages: 200,
        retryObserver: 1000,
        debounce: 150,
        settingsDebounce: 500
    },
    limits: {
        maxHistoryCheck: 15,
        maxRetries: 3
    }
};

// --- EXTENSION STATE ---
const SETTINGS_KEY = EXTENSION_NAME;
const DEFAULT_SETTINGS = {
    enabled: false,
    removeFromAllUserMessages: false,
    debugMode: false,
    removeOnlyImages: false,
    preserveFirstMessage: true,
    autoCleanup: true
};

let settings = { ...DEFAULT_SETTINGS };
let observer = null;
let isProcessing = false;
let debounceTimer = null;
let retryCount = 0;
let lastProcessedMessageCount = 0;

// --- UTILITY FUNCTIONS ---
/**
 * Enhanced logging with timestamps and better formatting
 */
function log(message, level = 'info') {
    if (!settings.debugMode && level === 'debug') return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [Attachment Remover]`;
    const styles = {
        info: 'color: #4CAF50',
        debug: 'color: #2196F3', 
        warn: 'color: #FF9800',
        error: 'color: #F44336'
    };
    
    console[level](`%c${prefix} ${message}`, styles[level] || '');
}

/**
 * Enhanced debounce with immediate execution option
 */
function debounce(func, delay, immediate = false) {
    return function(...args) {
        const callNow = immediate && !debounceTimer;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            if (!immediate) func.apply(this, args);
        }, delay);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Safe DOM query with error handling and null checks
 */
function safeQuery(selector, parent = document, multiple = false) {
    try {
        if (!parent) return multiple ? [] : null;
        const result = multiple ? parent.querySelectorAll(selector) : parent.querySelector(selector);
        return result || (multiple ? [] : null);
    } catch (error) {
        log(`Query error for "${selector}": ${error.message}`, 'error');
        return multiple ? [] : null;
    }
}

/**
 * Check if element is visible and in viewport
 */
function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
}

/**
 * Get message metadata for better processing
 */
function getMessageInfo(messageElement) {
    if (!messageElement) return null;
    
    return {
        element: messageElement,
        isUser: messageElement.hasAttribute('is_user') || messageElement.getAttribute('ch_name') === 'user',
        isAI: !messageElement.hasAttribute('is_user') && messageElement.getAttribute('ch_name') !== 'user',
        index: Array.from(messageElement.parentNode.children).indexOf(messageElement),
        hasAttachments: safeQuery(CONFIG.selectors.attachment, messageElement, true).length > 0
    };
}

// --- CORE ATTACHMENT REMOVAL LOGIC ---
/**
 * Enhanced attachment removal with better filtering
 */
function removeAttachmentsFromMessage(messageElement) {
    if (!messageElement) return 0;
    
    const attachments = safeQuery(CONFIG.selectors.attachment, messageElement, true);
    let removedCount = 0;
    
    attachments.forEach(attachment => {
        try {
            // Skip if it's part of the message text content (like inline images in responses)
            const messageText = safeQuery(CONFIG.selectors.messageText, messageElement);
            if (messageText && messageText.contains(attachment)) {
                log(`Skipping attachment in message text: ${attachment.tagName}`, 'debug');
                return;
            }
            
            // Additional filtering for image-only mode
            if (settings.removeOnlyImages && !isImageAttachment(attachment)) {
                log(`Skipping non-image attachment: ${attachment.tagName}`, 'debug');
                return;
            }
            
            log(`Removing attachment: ${attachment.outerHTML.substring(0, 100)}...`, 'debug');
            attachment.remove();
            removedCount++;
        } catch (error) {
            log(`Failed to remove attachment: ${error.message}`, 'error');
        }
    });
    
    return removedCount;
}

/**
 * Check if attachment is an image
 */
function isImageAttachment(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const src = element.src || '';
    
    return tagName === 'img' || 
           className.includes('mes_img') || 
           className.includes('inline_image') ||
           src.includes('user_uploads');
}

/**
 * Enhanced message processing with better logic
 */
function processNewMessages() {
    if (!settings.enabled || isProcessing) {
        log('Processing skipped - disabled or already processing', 'debug');
        return;
    }
    
    isProcessing = true;
    
    try {
        const chatContainer = safeQuery(CONFIG.selectors.chatContainer);
        if (!chatContainer) {
            log('Chat container not found', 'debug');
            retryObserver();
            return;
        }
        
        const messages = Array.from(safeQuery(CONFIG.selectors.message, chatContainer, true));
        const currentMessageCount = messages.length;
        
        // Only process if there are new messages
        if (currentMessageCount <= lastProcessedMessageCount) {
            log('No new messages to process', 'debug');
            return;
        }
        
        lastProcessedMessageCount = currentMessageCount;
        
        if (messages.length < 2) {
            log('Need at least 2 messages to process', 'debug');
            return;
        }
        
        const lastMessage = messages[messages.length - 1];
        const lastMessageInfo = getMessageInfo(lastMessage);
        
        if (!lastMessageInfo || !lastMessageInfo.isAI) {
            log('Last message is not from AI, waiting for response', 'debug');
            return;
        }
        
        log('AI response detected, processing attachments...');
        
        let totalRemoved = 0;
        let processedMessages = 0;
        
        // Process messages backwards from the second-to-last message
        for (let i = messages.length - 2; i >= 0; i--) {
            const currentMessage = messages[i];
            const messageInfo = getMessageInfo(currentMessage);
            
            if (!messageInfo) continue;
            
            // Stop at previous AI message (end of current turn)
            if (messageInfo.isAI) {
                log(`Reached previous AI message at index ${i}, stopping`, 'debug');
                break;
            }
            
            // Skip first message if preservation is enabled
            if (settings.preserveFirstMessage && i === 0) {
                log('Preserving first message as configured', 'debug');
                continue;
            }
            
            // Process user message
            if (messageInfo.isUser && messageInfo.hasAttachments) {
                const removedCount = removeAttachmentsFromMessage(currentMessage);
                totalRemoved += removedCount;
                processedMessages++;
                
                if (removedCount > 0) {
                    log(`Removed ${removedCount} attachment(s) from message ${i}`);
                }
                
                // Stop if only processing most recent user message
                if (!settings.removeFromAllUserMessages) {
                    log('Processing only most recent user message, stopping', 'debug');
                    break;
                }
            }
            
            // Safety limit
            if (processedMessages >= CONFIG.limits.maxHistoryCheck) {
                log('Reached processing limit, stopping', 'debug');
                break;
            }
        }
        
        if (totalRemoved > 0) {
            log(`Successfully removed ${totalRemoved} attachments from ${processedMessages} messages`);
            
            // Trigger save if auto-cleanup is enabled
            if (settings.autoCleanup) {
                setTimeout(() => {
                    eventSource.emit(event_types.MESSAGE_UPDATED);
                }, 100);
            }
        } else {
            log('No attachments found to remove', 'debug');
        }
        
        retryCount = 0; // Reset retry count on successful processing
        
    } catch (error) {
        log(`Error processing messages: ${error.message}`, 'error');
        retryCount++;
        
        if (retryCount < CONFIG.limits.maxRetries) {
            setTimeout(() => processNewMessages(), CONFIG.delays.processMessages * retryCount);
        }
    } finally {
        isProcessing = false;
    }
}

// --- OBSERVER MANAGEMENT ---
const debouncedProcessMessages = debounce(processNewMessages, CONFIG.delays.debounce);

/**
 * Enhanced mutation observer with better change detection
 */
function createObserver() {
    if (observer) {
        observer.disconnect();
        log('Disconnected existing observer', 'debug');
    }
    
    observer = new MutationObserver(mutations => {
        let shouldProcess = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's a message or contains messages
                        if (node.matches && node.matches(CONFIG.selectors.message)) {
                            shouldProcess = true;
                            break;
                        }
                        if (safeQuery(CONFIG.selectors.message, node)) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
            }
            
            // Also watch for attribute changes that might indicate message updates
            if (mutation.type === 'attributes' && 
                mutation.target.matches && 
                mutation.target.matches(CONFIG.selectors.message)) {
                shouldProcess = true;
            }
            
            if (shouldProcess) break;
        }
        
        if (shouldProcess) {
            log('DOM changes detected, scheduling processing', 'debug');
            setTimeout(debouncedProcessMessages, CONFIG.delays.processMessages);
        }
    });
    
    return observer;
}

/**
 * Enhanced observer startup with retry logic
 */
function startObserver() {
    const chatContainer = safeQuery(CONFIG.selectors.chatContainer);
    
    if (chatContainer) {
        createObserver();
        observer.observe(chatContainer, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'is_user', 'ch_name']
        });
        
        log('Observer started successfully');
        
        // Process existing messages
        setTimeout(debouncedProcessMessages, CONFIG.delays.processMessages);
        return true;
    } else {
        log(`Chat container not found, retrying in ${CONFIG.delays.retryObserver}ms`, 'debug');
        retryObserver();
        return false;
    }
}

function retryObserver() {
    if (retryCount < CONFIG.limits.maxRetries) {
        retryCount++;
        setTimeout(startObserver, CONFIG.delays.retryObserver * retryCount);
    } else {
        log('Max retries reached, observer startup failed', 'error');
    }
}

function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
        log('Observer stopped');
    }
    retryCount = 0;
}

// --- SETTINGS MANAGEMENT ---
function saveSettings() {
    try {
        extension_settings[SETTINGS_KEY] = { ...settings };
        saveSettingsDebounced();
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
        } else {
            log('No saved settings found, using defaults', 'debug');
            settings = { ...DEFAULT_SETTINGS };
        }
    } catch (error) {
        log(`Failed to load settings: ${error.message}`, 'error');
        settings = { ...DEFAULT_SETTINGS };
    }
}

const debouncedSaveSettings = debounce(saveSettings, CONFIG.delays.settingsDebounce);

function onSettingsChange() {
    try {
        const elements = {
            enabled: document.getElementById('attachment_remover_enable'),
            allMessages: document.getElementById('attachment_remover_all_messages'),
            debug: document.getElementById('attachment_remover_debug'),
            imagesOnly: document.getElementById('attachment_remover_images_only'),
            preserveFirst: document.getElementById('attachment_remover_preserve_first'),
            autoCleanup: document.getElementById('attachment_remover_auto_cleanup')
        };
        
        // Update settings from UI
        if (elements.enabled) {
            const wasEnabled = settings.enabled;
            settings.enabled = elements.enabled.checked;
            
            if (settings.enabled && !wasEnabled) {
                log('Extension enabled, starting observer');
                startObserver();
            } else if (!settings.enabled && wasEnabled) {
                log('Extension disabled, stopping observer');
                stopObserver();
            }
        }
        
        if (elements.allMessages) {
            settings.removeFromAllUserMessages = elements.allMessages.checked;
        }
        
        if (elements.debug) {
            settings.debugMode = elements.debug.checked;
        }
        
        if (elements.imagesOnly) {
            settings.removeOnlyImages = elements.imagesOnly.checked;
        }
        
        if (elements.preserveFirst) {
            settings.preserveFirstMessage = elements.preserveFirst.checked;
        }
        
        if (elements.autoCleanup) {
            settings.autoCleanup = elements.autoCleanup.checked;
        }
        
        debouncedSaveSettings();
        log(`Settings updated: ${JSON.stringify(settings)}`, 'debug');
        
    } catch (error) {
        log(`Error updating settings: ${error.message}`, 'error');
    }
}

// --- SETTINGS UI ---
async function loadSettingsHtml() {
    try {
        const response = await fetch(`${EXTENSION_FOLDER_PATH}/settings.html`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        log(`Failed to load settings HTML: ${error.message}`, 'error');
        return null;
    }
}

// Removed loadSettingsCss function as CSS is now inline in settings.html

async function onSettingsDivRender(div) {
    // Removed call to loadSettingsCss()
    
    const html = await loadSettingsHtml();
    if (!html) {
        div.innerHTML = `
            <div class="attachment-remover-error">
                <h4>Attachment Remover Settings</h4>
                <p>Failed to load settings interface. Please check that settings.html exists.</p>
            </div>
        `;
        return;
    }
    
    div.innerHTML = html;
    
    // Initialize all checkboxes
    const checkboxes = {
        attachment_remover_enable: settings.enabled,
        attachment_remover_all_messages: settings.removeFromAllUserMessages,
        attachment_remover_debug: settings.debugMode,
        attachment_remover_images_only: settings.removeOnlyImages,
        attachment_remover_preserve_first: settings.preserveFirstMessage,
        attachment_remover_auto_cleanup: settings.autoCleanup
    };
    
    Object.entries(checkboxes).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.checked = value;
            element.addEventListener('change', onSettingsChange);
            log(`Initialized ${id} checkbox`, 'debug');
        } else {
            log(`Checkbox ${id} not found in HTML`, 'error');
        }
    });
    
    log('Settings UI initialized successfully');
}

// --- CLEANUP AND INITIALIZATION ---
function cleanup() {
    stopObserver();
    clearTimeout(debounceTimer);
    log('Extension cleaned up');
}

// --- EVENT HANDLERS ---
function onChatChanged() {
    if (settings.enabled) {
        log('Chat changed, restarting observer');
        stopObserver();
        setTimeout(startObserver, CONFIG.delays.processMessages);
    }
}

function onMessageDeleted() {
    lastProcessedMessageCount = Math.max(0, lastProcessedMessageCount - 1);
}

// --- INITIALIZATION ---
jQuery(async () => {
    try {
        log('Initializing Attachment Remover extension...');
        
        loadSettings();
        
        // Register settings UI renderer
        window[`${EXTENSION_NAME}_settings`] = onSettingsDivRender;
        
        // Register event listeners
        eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
        eventSource.on(event_types.MESSAGE_DELETED, onMessageDeleted);
        
        // Start observer if enabled
        if (settings.enabled) {
            log('Extension enabled, starting observer');
            startObserver();
        }
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', cleanup);
        
        log('Attachment Remover extension initialized successfully');
        
    } catch (error) {
        log(`Initialization failed: ${error.message}`, 'error');
    }
});

// Export for SillyTavern
export { onSettingsDivRender };