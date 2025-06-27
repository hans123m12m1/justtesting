// content.js for Attachment Remover Extension

// Import necessary SillyTavern objects/functions
import {
    saveSettingsDebounced,
} from '../../../../script.js';
import {
    extension_settings,
} from '../../../extensions.js';

// --- CONFIGURATION ---
const LOG_PREFIX = `[AttachmentRemoverExt]`;
const EXTENSION_NAME = "AttachmentRemover";

const SELECTORS = {
    settingsContainer: '.attachment-remover-settings',
    enableCheckbox: '#attachment_remover_enable',
    allMessagesCheckbox: '#attachment_remover_all_messages',
    imagesOnlyCheckbox: '#attachment_remover_images_only',
    preserveFirstCheckbox: '#attachment_remover_preserve_first',
    autoCleanupCheckbox: '#attachment_remover_auto_cleanup',
    debugModeCheckbox: '#attachment_remover_debug',
    chatContainer: '#chat',
    message: '.mes',
    userMessage: '.mes_right',
    aiMessage: '.mes_left',
    attachment: '.mes_img, .attachment_holder, .mes_file, .inline_image, img[src*="user_uploads"]',
};

const defaultSettings = {
    enable: false,
    allMessages: false,
    imagesOnly: false,
    preserveFirst: false,
    autoCleanup: false,
    debug: false,
};

let currentSettings = { ...defaultSettings };

// --- HELPER FUNCTIONS ---
function ensureSettingsNamespace() {
    if (!extension_settings) return false;
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    return true;
}

function loadSettings() {
    if (ensureSettingsNamespace()) {
        Object.assign(currentSettings, defaultSettings, extension_settings[EXTENSION_NAME]);
    }
    if (currentSettings.debug) console.log(`${LOG_PREFIX} Settings loaded:`, { ...currentSettings });
}

function saveSetting(key, value) {
    if (ensureSettingsNamespace()) {
        currentSettings[key] = value;
        extension_settings[EXTENSION_NAME][key] = value;
        saveSettingsDebounced();
        if (currentSettings.debug) console.log(`${LOG_PREFIX} Setting saved: ${key} = ${value}`);
    }
}

function logDebug(message, ...args) {
    if (currentSettings.debug) {
        console.log(`${LOG_PREFIX} DEBUG: ${message}`, ...args);
    }
}

// Polyfill for findLastIndex for older browsers
function findLastIndex(array, predicate) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
}

// --- CORE LOGIC ---
function removeAttachments() {
    if (!currentSettings.enable) return;

    const chatContainer = document.querySelector(SELECTORS.chatContainer);
    if (!chatContainer) return;

    const messages = Array.from(chatContainer.querySelectorAll(SELECTORS.message));
    const lastAiMessageIndex = findLastIndex(messages, msg => msg.matches(SELECTORS.aiMessage));
    if (lastAiMessageIndex === -1) {
        logDebug('No AI message found to determine the current turn.');
        return;
    }

    let attachmentsRemovedCount = 0;
    let foundCurrentUserMessage = false;

    for (let i = lastAiMessageIndex - 1; i >= 0; i--) {
        const message = messages[i];
        
        // Stop if we find another AI message
        if (message.matches(SELECTORS.aiMessage)) {
            logDebug(`Stopped at previous AI message (index ${i}).`);
            break;
        }

        // Only process user messages
        if (!message.matches(SELECTORS.userMessage)) continue;

        // Check if we're at the first message in the chat
        const isFirstMessage = i === 0;
        
        if (currentSettings.preserveFirst && isFirstMessage) {
            logDebug('Preserving attachments in the first message.');
            continue;
        }

        const attachments = Array.from(message.querySelectorAll(SELECTORS.attachment));
        if (attachments.length === 0) continue;

        logDebug(`Found ${attachments.length} attachments in user message at index ${i}.`);
        
        attachments.forEach(attachment => {
            const isImage = attachment.tagName === 'IMG' || 
                           attachment.classList.contains('mes_img') || 
                           attachment.classList.contains('inline_image');
            
            if (currentSettings.imagesOnly && !isImage) {
                logDebug('Skipping non-image attachment.', attachment);
                return;
            }
            
            attachment.remove();
            attachmentsRemovedCount++;
            logDebug('Removed attachment:', attachment);
        });

        foundCurrentUserMessage = true;
        
        if (!currentSettings.allMessages) {
            logDebug('Stopped after the most recent user message.');
            break;
        }
    }

    if (attachmentsRemovedCount > 0) {
        console.log(`${LOG_PREFIX} Successfully removed ${attachmentsRemovedCount} attachment(s).`);
        
        if (currentSettings.autoCleanup) {
            // Trigger chat cleanup
            if (typeof chat === 'object' && typeof chat.cleanupChat === 'function') {
                chat.cleanupChat();
                logDebug('Triggered chat cleanup after attachment removal.');
            }
        }
    }
}

// --- UI AND INITIALIZATION ---
async function initializeAttachmentRemoverUI() {
    const container = document.getElementById('extensions_settings');
    if (!container || document.querySelector(SELECTORS.settingsContainer)) return;

    try {
        const response = await fetch(`scripts/extensions/third-party/${EXTENSION_NAME}/settings.html`);
        if (!response.ok) {
            console.error(`${LOG_PREFIX} Failed to fetch settings.html:`, response.status, response.statusText);
            return;
        }
        const html = await response.text();
        container.insertAdjacentHTML('beforeend', html);
        logDebug('Settings UI injected.');

        loadSettings();

        const inputs = {
            enable: document.querySelector(SELECTORS.enableCheckbox),
            allMessages: document.querySelector(SELECTORS.allMessagesCheckbox),
            imagesOnly: document.querySelector(SELECTORS.imagesOnlyCheckbox),
            preserveFirst: document.querySelector(SELECTORS.preserveFirstCheckbox),
            autoCleanup: document.querySelector(SELECTORS.autoCleanupCheckbox),
            debug: document.querySelector(SELECTORS.debugModeCheckbox),
        };

        for (const [key, input] of Object.entries(inputs)) {
            if (input) {
                input.checked = currentSettings[key];
                input.addEventListener('change', (event) => saveSetting(key, event.target.checked));
            }
        }

    } catch (error) {
        console.error(`${LOG_PREFIX} Error injecting or initializing settings UI:`, error);
    }
}

// THIS IS THE NEW EXPORTED FUNCTION THAT index.js WILL CALL
export async function initializeExtension() {
    console.log(`${LOG_PREFIX} Initializing extension...`);
    ensureSettingsNamespace();
    await initializeAttachmentRemoverUI();

    const chatContainer = document.querySelector(SELECTORS.chatContainer);
    if (chatContainer) {
        const chatObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    const hasAiMessage = Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === 1 && node.matches(SELECTORS.aiMessage)
                    );
                    if (hasAiMessage) {
                        logDebug('New AI message detected. Triggering attachment removal.');
                        setTimeout(removeAttachments, 100);
                        return;
                    }
                }
            }
        });
        chatObserver.observe(chatContainer, { childList: true, subtree: true });
        console.log(`${LOG_PREFIX} Chat observer initialized.`);
    } else {
        console.error(`${LOG_PREFIX} Chat container not found. Attachment removal will not function.`);
    }
    console.log(`${LOG_PREFIX} Initialization complete.`);
}