// content.js for Attachment Remover Extension

// Import necessary SillyTavern objects/functions
// Adjust paths as necessary for your specific SillyTavern installation
import {
    saveSettingsDebounced,
    eventSource,
    event_types,
    // If you need to trigger a chat save/cleanup directly, you might need to find
    // the relevant function in SillyTavern's core scripts. For now, it's a console warning.
    // For example, if `saveChat` was exposed:
    // saveChat,
} from '../../../../script.js';
import {
    extension_settings,
} from '../../../extensions.js';

// 0. DYNAMIC DEPENDENCY LOADING (Not strictly needed for this simple extension, but good practice)
// -----------------------------------------------------------------------------
const LOG_PREFIX = `[AttachmentRemoverExt]`;

// 1. CONFIGURATION
// -----------------------------------------------------------------------------
const EXTENSION_NAME = "AttachmentRemoverExt";

const SELECTORS = {
    settingsContainer: '.attachment-remover-settings',
    enableCheckbox: '#attachment_remover_enable',
    allMessagesCheckbox: '#attachment_remover_all_messages',
    imagesOnlyCheckbox: '#attachment_remover_images_only',
    preserveFirstCheckbox: '#attachment_remover_preserve_first',
    autoCleanupCheckbox: '#attachment_remover_auto_cleanup',
    debugModeCheckbox: '#attachment_remover_debug',

    // Chat message selectors (from the help section in settings.html)
    chatContainer: '#chat',
    message: '.mes',
    userMessage: '.mes.mes_right', // Assuming user messages have this class
    aiMessage: '.mes.mes_left', // Assuming AI messages have this class
    attachment: '.mes_img, .attachment_holder, .mes_file, .inline_image, img[src*="user_uploads"]',
};

// Default settings
const defaultSettings = {
    enable: false,
    allMessages: false,
    imagesOnly: false,
    preserveFirst: false,
    autoCleanup: false,
    debug: false,
};

// State variables
let currentSettings = { ...defaultSettings };

// 2. UTILITY & HELPER FUNCTIONS
// -----------------------------------------------------------------------------
function ensureSettingsNamespace() {
    if (!extension_settings) {
        console.warn(`${LOG_PREFIX} extension_settings not available.`);
        return false;
    }
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    return true;
}

function loadSettings() {
    if (ensureSettingsNamespace()) {
        // Merge saved settings with defaults to ensure all keys exist
        Object.assign(currentSettings, extension_settings[EXTENSION_NAME]);
    }
    if (currentSettings.debug) console.log(`${LOG_PREFIX} Settings loaded:`, currentSettings);
}

function saveSetting(key, value) {
    if (ensureSettingsNamespace()) {
        extension_settings[EXTENSION_NAME][key] = value;
        saveSettingsDebounced();
        currentSettings[key] = value; // Update local state immediately
        if (currentSettings.debug) console.log(`${LOG_PREFIX} Setting saved: ${key} = ${value}`);
    }
}

function logDebug(message, ...args) {
    if (currentSettings.debug) {
        console.log(`${LOG_PREFIX} DEBUG: ${message}`, ...args);
    }
}

// 3. CORE ATTACHMENT REMOVAL LOGIC
// -----------------------------------------------------------------------------

/**
 * Removes attachments from user messages based on current settings.
 * This function is triggered after an AI message is added to the chat.
 */
function removeAttachments() {
    if (!currentSettings.enable) {
        logDebug('Attachment removal is disabled.');
        return;
    }

    const chatContainer = document.querySelector(SELECTORS.chatContainer);
    if (!chatContainer) {
        logDebug('Chat container not found.');
        return;
    }

    const messages = Array.from(chatContainer.querySelectorAll(SELECTORS.message));
    if (messages.length === 0) {
        logDebug('No messages found in chat.');
        return;
    }

    // Find the last AI message, which signifies the end of the current turn
    let lastAiMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].classList.contains('mes_left')) { // Assuming AI messages have 'mes_left'
            lastAiMessageIndex = i;
            break;
        }
    }

    if (lastAiMessageIndex === -1) {
        logDebug('No AI message found to determine the current turn. Skipping removal.');
        return;
    }

    // Iterate backwards from the AI message to find user messages in the current turn
    let attachmentsRemovedCount = 0;
    for (let i = lastAiMessageIndex - 1; i >= 0; i--) {
        const message = messages[i];

        // Stop if we hit a previous AI message (start of a new turn)
        if (message.classList.contains('mes_left')) {
            logDebug(`Stopped at previous AI message (index ${i}).`);
            break;
        }

        // Only process user messages
        if (message.classList.contains('mes_right')) { // Assuming user messages have 'mes_right'
            // Preserve first message logic
            if (currentSettings.preserveFirst && i === 0) {
                logDebug('Preserving attachments in the very first message.');
                continue;
            }

            const attachments = Array.from(message.querySelectorAll(SELECTORS.attachment));
            if (attachments.length > 0) {
                logDebug(`Found ${attachments.length} attachments in user message at index ${i}.`);
                attachments.forEach(attachment => {
                    // Images only logic
                    if (currentSettings.imagesOnly) {
                        // Check if it's an image element or has image-related classes
                        const isImage = attachment.tagName === 'IMG' || attachment.classList.contains('mes_img') || attachment.classList.contains('inline_image');
                        if (!isImage) {
                            logDebug('Skipping non-image attachment due to "Remove Images Only" setting.', attachment);
                            return;
                        }
                    }
                    
                    attachment.remove();
                    attachmentsRemovedCount++;
                    logDebug('Removed attachment:', attachment);
                });
            }

            // If not removing from all messages, stop after the most recent user message
            if (!currentSettings.allMessages) {
                logDebug('Stopped after the most recent user message due to "Remove from All User Messages" setting.');
                break;
            }
        }
    }

    if (attachmentsRemovedCount > 0) {
        console.log(`${LOG_PREFIX} Successfully removed ${attachmentsRemovedCount} attachment(s).`);
        if (currentSettings.autoCleanup) {
            // Placeholder for auto-cleanup. SillyTavern's chat save/cleanup function
            // is not directly exposed via `script.js` imports in a standard way.
            // You might need to find the specific function or trigger a UI event (e.g., click a save button).
            console.warn(`${LOG_PREFIX} Auto Cleanup is enabled, but direct API for chat cleanup is not available. Manual cleanup may be required.`);
            // Example if a global save function existed:
            // if (typeof saveChat === 'function') {
            //     saveChat();
            // }
        }
    } else {
        logDebug('No attachments found for removal in the current turn.');
    }
}


// 4. UI INITIALIZATION AND EVENT HANDLING
// -----------------------------------------------------------------------------

/**
 * Injects the settings HTML into the SillyTavern extensions panel
 * and attaches event listeners to the checkboxes.
 */
async function initializeAttachmentRemoverUI() {
    const container = document.getElementById('extensions_settings');
    if (!container) {
        console.error(`${LOG_PREFIX} Extensions settings container not found.`);
        return;
    }

    // Prevent re-injection if already present
    if (document.querySelector(SELECTORS.settingsContainer)) {
        logDebug('Settings UI already injected.');
        return;
    }

    logDebug('Injecting settings UI...');
    try {
        // Fetch the settings.html file
        const response = await fetch(`scripts/extensions/third-party/${EXTENSION_NAME}/settings.html`);
        if (!response.ok) {
            console.error(`${LOG_PREFIX} Failed to fetch settings.html:`, response.statusText);
            return;
        }
        const html = await response.text();
        container.insertAdjacentHTML('beforeend', html);
        logDebug('Settings UI injected.');

        // Load current settings and update UI checkbox states
        loadSettings();
        document.querySelector(SELECTORS.enableCheckbox).checked = currentSettings.enable;
        document.querySelector(SELECTORS.allMessagesCheckbox).checked = currentSettings.allMessages;
        document.querySelector(SELECTORS.imagesOnlyCheckbox).checked = currentSettings.imagesOnly;
        document.querySelector(SELECTORS.preserveFirstCheckbox).checked = currentSettings.preserveFirst;
        document.querySelector(SELECTORS.autoCleanupCheckbox).checked = currentSettings.autoCleanup;
        document.querySelector(SELECTORS.debugModeCheckbox).checked = currentSettings.debug;

        // Attach event listeners to checkboxes to save settings on change
        document.querySelector(SELECTORS.enableCheckbox).addEventListener('change', (event) => {
            saveSetting('enable', event.target.checked);
        });
        document.querySelector(SELECTORS.allMessagesCheckbox).addEventListener('change', (event) => {
            saveSetting('allMessages', event.target.checked);
        });
        document.querySelector(SELECTORS.imagesOnlyCheckbox).addEventListener('change', (event) => {
            saveSetting('imagesOnly', event.target.checked);
        });
        document.querySelector(SELECTORS.preserveFirstCheckbox).addEventListener('change', (event) => {
            saveSetting('preserveFirst', event.target.checked);
        });
        document.querySelector(SELECTORS.autoCleanupCheckbox).addEventListener('change', (event) => {
            saveSetting('autoCleanup', event.target.checked);
        });
        document.querySelector(SELECTORS.debugModeCheckbox).addEventListener('change', (event) => {
            saveSetting('debug', event.target.checked);
            // Reload settings immediately to apply debug mode change for console logging
            loadSettings();
        });

    } catch (error) {
        console.error(`${LOG_PREFIX} Error injecting or initializing settings UI:`, error);
    }
}

// 5. MAIN INITIALIZATION ENTRY POINT
// -----------------------------------------------------------------------------
$(document).ready(() => {
    // Use a small delay to ensure SillyTavern's core UI and global objects are fully ready
    setTimeout(async function() {
        try {
            console.log(`${LOG_PREFIX} Initializing extension...`);
            ensureSettingsNamespace(); // Ensure settings object exists early

            // Initialize UI first, which also loads initial settings
            await initializeAttachmentRemoverUI();

            // Set up a MutationObserver to watch the chat container for new AI messages
            const chatContainer = document.querySelector(SELECTORS.chatContainer);
            if (chatContainer) {
                const chatObserver = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            for (const node of mutation.addedNodes) {
                                // Check if the added node is an element and specifically an AI message
                                if (node.nodeType === 1 && node.classList.contains('mes_left')) {
                                    logDebug('New AI message detected. Triggering attachment removal.');
                                    // Use a small delay to ensure all DOM updates for the message are complete
                                    // before attempting to remove attachments.
                                    setTimeout(removeAttachments, 100);
                                    return; // Only need to trigger removal once per AI message addition
                                }
                            }
                        }
                    }
                });
                // Observe for changes in children of the chat container
                chatObserver.observe(chatContainer, { childList: true });
                console.log(`${LOG_PREFIX} Chat container observer initialized.`);
            } else {
                console.warn(`${LOG_PREFIX} Chat container not found, attachment removal will not function.`);
            }

            console.log(`${LOG_PREFIX} Initialization complete.`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Critical failure during initialization:`, error);
        }
    }, 1000); // Delay execution by 1 second
});