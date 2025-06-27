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
        processMessages: 150, // Delay before processing messages after a DOM change
        retryObserver: 500,   // Delay before retrying to start the observer if chat container not found
        debounce: 100         // Debounce delay for processing messages
    },
    limits: {
        maxHistoryCheck: 10 // Limit how far back we check for attachments in user messages
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
/**
 * Logs messages to the console, respecting the debugMode setting.
 * @param {string} message - The message to log.
 * @param {'info' | 'debug' | 'warn' | 'error'} level - The log level.
 */
function log(message, level = 'info') {
    if (!settings.debugMode && level === 'debug') return; // Skip debug logs if not in debug mode
    const prefix = '[Attachment Remover]';
    console[level](`${prefix} ${message}`);
}

/**
 * Debounces a function call.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Safely queries for a single DOM element.
 * @param {string} selector - The CSS selector.
 * @param {Element | Document} parent - The parent element to search within.
 * @returns {Element | null} - The found element or null.
 */
function safeQuerySelector(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (error) {
        log(`Invalid selector "${selector}": ${error.message}`, 'error');
        return null;
    }
}

/**
 * Safely queries for multiple DOM elements.
 * @param {string} selector - The CSS selector.
 * @param {Element | Document} parent - The parent element to search within.
 * @returns {NodeListOf<Element>} - A NodeList of found elements (can be empty).
 */
function safeQuerySelectorAll(selector, parent = document) {
    try {
        return parent.querySelectorAll(selector);
    } catch (error) {
        log(`Invalid selector "${selector}": ${error.message}`, 'error');
        return [];
    }
}

// --- CORE LOGIC ---
/**
 * Removes attachment preview elements from a given message element.
 * @param {Element} message - The message DOM element.
 * @returns {number} - The count of attachments removed.
 */
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

/**
 * Checks if a message element is an AI message.
 * @param {Element} message - The message DOM element.
 * @returns {boolean} - True if it's an AI message, false otherwise.
 */
function isAIMessage(message) {
    return message.matches(CONFIG.selectors.aiMessage);
}

/**
 * Processes new messages in the chat log to remove attachments.
 * This function is debounced and triggered by the MutationObserver.
 */
function processNewMessages() {
    if (!settings.enabled || isProcessing) {
        log('Processing skipped - disabled or already processing', 'debug');
        return;
    }

    isProcessing = true; // Set flag to prevent re-entry
    
    try {
        const chatContainer = safeQuerySelector(CONFIG.selectors.chatContainer);
        if (!chatContainer) {
            log('Chat container not found, cannot process messages.', 'debug');
            return;
        }

        const messages = Array.from(safeQuerySelectorAll(CONFIG.selectors.message, chatContainer));
        // Need at least one user message and the subsequent AI message to process
        if (messages.length < 2) { 
            log('Not enough messages to process (at least one user message and one AI message needed).', 'debug');
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!isAIMessage(lastMessage)) {
            log('Last message is not from AI, skipping attachment removal as AI has not responded yet.', 'debug');
            return;
        }

        log('AI response detected. Checking for attachments to remove from preceding user messages...');

        let totalRemoved = 0;
        // Start checking from the message *before* the last AI message (messages.length - 2)
        // and go backwards, up to CONFIG.limits.maxHistoryCheck messages or the very start of the chat.
        // The loop condition ensures we don't go below index 0.
        const startIndex = messages.length - 2; 
        const endIndex = Math.max(0, messages.length - 1 - CONFIG.limits.maxHistoryCheck); 

        for (let i = startIndex; i >= endIndex; i--) {
            const currentMessage = messages[i];
            
            // If we encounter another AI message while scanning backwards, it usually signifies a new "turn" or conversation boundary.
            // We stop here to avoid removing attachments from previous, already-responded-to turns.
            if (isAIMessage(currentMessage)) {
                log(`Hit previous AI message at index ${i}, stopping scan for attachments in older turns.`, 'debug');
                break;
            }

            const removedCount = removeAttachmentsFromMessage(currentMessage);
            totalRemoved += removedCount;

            if (removedCount > 0) {
                log(`Removed ${removedCount} attachment(s) from user message at index ${i}.`);
                
                // If the setting is to remove only from the most recent user message, we stop after the first one we find.
                if (!settings.removeFromAllUserMessages) {
                    log('Setting "Remove from all user messages" is off, stopping after first successful removal.', 'debug');
                    break;
                }
            } else {
                log(`No attachments found in user message at index ${i}.`, 'debug');
            }
        }

        if (totalRemoved > 0) {
            log(`Total attachments removed in this turn: ${totalRemoved}.`);
        } else {
            log('No attachments found or removed in this turn.', 'debug');
        }

    } catch (error) {
        log(`Error processing messages: ${error.message}`, 'error');
    } finally {
        isProcessing = false; // Reset processing flag
    }
}

// --- DOM OBSERVER ---
const debouncedProcessMessages = debounce(processNewMessages, CONFIG.delays.debounce);

/**
 * Creates and returns a new MutationObserver instance.
 * Disconnects any existing observer first.
 * @returns {MutationObserver} - The new observer instance.
 */
function createObserver() {
    if (observer) {
        observer.disconnect();
        log('Existing observer disconnected.', 'debug');
    }

    observer = new MutationObserver(mutations => {
        let shouldProcess = false;

        for (const mutation of mutations) {
            // Check for added nodes in the chat container (new messages or message content)
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    // Check if the added node is a message itself or contains a message
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        (node.matches(CONFIG.selectors.message) || 
                         node.querySelector(CONFIG.selectors.message))) {
                        shouldProcess = true;
                        break;
                    }
                }
            }
            if (shouldProcess) break; // If we found a message addition, no need to check further mutations
        }

        if (shouldProcess) {
            log('DOM changes detected (new message likely added), scheduling message processing.', 'debug');
            // Use setTimeout to allow DOM to settle before processing
            setTimeout(debouncedProcessMessages, CONFIG.delays.processMessages);
        }
    });

    return observer;
}

/**
 * Attempts to start the MutationObserver on the chat container.
 * Retries if the container is not immediately available.
 * @returns {boolean} - True if observer started, false if retrying.
 */
function startObserver() {
    const chatContainer = safeQuerySelector(CONFIG.selectors.chatContainer);
    
    if (chatContainer) {
        createObserver();
        observer.observe(chatContainer, { 
            childList: true, // Observe direct children additions/removals
            subtree: true    // Observe changes in descendants as well
        });
        log('Observer started successfully on chat container.');
        // Immediately try to process existing messages when observer starts
        setTimeout(debouncedProcessMessages, CONFIG.delays.processMessages); 
        return true;
    } else {
        log(`Chat container "${CONFIG.selectors.chatContainer}" not found, retrying in ${CONFIG.delays.retryObserver}ms...`, 'debug');
        setTimeout(startObserver, CONFIG.delays.retryObserver);
        return false;
    }
}

/**
 * Stops the current MutationObserver.
 */
function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
        log('Observer stopped.');
    }
}

// --- SETTINGS MANAGEMENT ---
/**
 * Saves the current extension settings to SillyTavern's extension_settings.
 */
function saveSettings() {
    try {
        extension_settings[SETTINGS_KEY] = { ...settings };
        log(`Settings saved: ${JSON.stringify(settings)}`, 'debug');
    } catch (error) {
        log(`Failed to save settings: ${error.message}`, 'error');
    }
}

/**
 * Loads extension settings from SillyTavern's extension_settings,
 * falling back to default settings if none are found or an error occurs.
 */
function loadSettings() {
    try {
        const savedSettings = extension_settings[SETTINGS_KEY];
        if (savedSettings && typeof savedSettings === 'object') {
            // Merge saved settings with defaults to ensure all keys are present
            settings = { ...DEFAULT_SETTINGS, ...savedSettings };
            log(`Settings loaded: ${JSON.stringify(settings)}`, 'debug');
        } else {
            log('No saved settings found, using default settings.', 'debug');
            settings = { ...DEFAULT_SETTINGS };
        }
    } catch (error) {
        log(`Failed to load settings: ${error.message}, falling back to default settings.`, 'error');
        settings = { ...DEFAULT_SETTINGS };
    }
}

/**
 * Handles changes to the settings checkboxes in the UI.
 * Updates internal settings, saves them, and manages the observer state.
 */
function onSettingsChange() {
    try {
        const enabledCheckbox = document.getElementById('attachment_remover_enable');
        const allMessagesCheckbox = document.getElementById('attachment_remover_all_messages');
        const debugCheckbox = document.getElementById('attachment_remover_debug');

        if (enabledCheckbox) {
            settings.enabled = enabledCheckbox.checked;
            // Start/stop observer based on enabled state
            if (settings.enabled) {
                log('Extension enabled. Attempting to start observer...');
                startObserver();
            } else {
                log('Extension disabled. Stopping observer...');
                stopObserver();
            }
        } else {
            log('Enabled checkbox element not found during change event!', 'error');
        }

        if (allMessagesCheckbox) {
            settings.removeFromAllUserMessages = allMessagesCheckbox.checked;
        } else {
            log('Remove from all messages checkbox element not found during change event!', 'error');
        }

        if (debugCheckbox) {
            settings.debugMode = debugCheckbox.checked;
        } else {
            log('Debug mode checkbox element not found during change event!', 'error');
        }

        saveSettings();
        log(`Settings updated - Enabled: ${settings.enabled}, Remove From All User Messages: ${settings.removeFromAllUserMessages}, Debug Mode: ${settings.debugMode}`);
        
    } catch (error) {
        log(`Error updating settings: ${error.message}`, 'error');
    }
}

// --- SETTINGS UI ---
/**
 * Renders the extension's settings UI into the provided div element.
 * Loads settings.html and styles.css, then connects UI elements to settings.
 * @param {HTMLDivElement} div - The div element to render the settings into.
 */
function onSettingsDivRender(div) {
    // const context = getContext(); // 'getContext' is available but not used here. Can be removed if not needed for future features.
    const settingsHtmlPath = `extensions/attachment_remover/settings.html`;
    const settingsCssPath = `extensions/attachment_remover/styles.css`;

    // Load CSS file if not already present
    const existingLink = document.querySelector(`link[href="${settingsCssPath}"]`);
    if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = settingsCssPath;
        link.onerror = () => log(`Failed to load CSS file from ${settingsCssPath}. Check file path.`, 'error');
        document.head.appendChild(link);
        log(`CSS file "${settingsCssPath}" appended to document head.`, 'debug');
    } else {
        log(`CSS file "${settingsCssPath}" already loaded.`, 'debug');
    }

    // Load HTML content for the settings panel
    fetch(settingsHtmlPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.text();
        })
        .then(html => {
            div.innerHTML = html;
            
            // Connect UI elements (checkboxes) to their respective settings and event listeners
            const enabledCheckbox = document.getElementById('attachment_remover_enable');
            const allMessagesCheckbox = document.getElementById('attachment_remover_all_messages');
            const debugCheckbox = document.getElementById('attachment_remover_debug');

            if (enabledCheckbox) {
                enabledCheckbox.checked = settings.enabled;
                enabledCheckbox.addEventListener('change', onSettingsChange);
                log('Enabled checkbox initialized and event listener attached.', 'debug');
            } else {
                log('Error: "attachment_remover_enable" checkbox element not found in settings.html!', 'error');
            }

            if (allMessagesCheckbox) {
                allMessagesCheckbox.checked = settings.removeFromAllUserMessages;
                allMessagesCheckbox.addEventListener('change', onSettingsChange);
                log('Remove from all messages checkbox initialized and event listener attached.', 'debug');
            } else {
                log('Error: "attachment_remover_all_messages" checkbox element not found in settings.html!', 'error');
            }

            if (debugCheckbox) {
                debugCheckbox.checked = settings.debugMode;
                debugCheckbox.addEventListener('change', onSettingsChange);
                log('Debug mode checkbox initialized and event listener attached.', 'debug');
            } else {
                log('Error: "attachment_remover_debug" checkbox element not found in settings.html!', 'error');
            }

            log('Settings UI loaded successfully.');
        })
        .catch(error => {
            log(`Failed to load settings HTML from ${settingsHtmlPath}: ${error.message}. Please ensure the file exists.`, 'error');
            div.innerHTML = `
                <div class="attachment-remover-error">
                    <h4>Attachment Remover Settings</h4>
                    <p>Error loading settings interface: ${error.message}</p>
                    <p>Please check that the <code>settings.html</code> file exists in the <code>extensions/attachment_remover/</code> directory.</p>
                </div>
            `;
        });
}

// --- CLEANUP ---
/**
 * Performs cleanup operations when the extension is unloaded or the page changes.
 */
function cleanup() {
    stopObserver();
    clearTimeout(debounceTimer);
    log('Extension cleaned up successfully.');
}

// --- INITIALIZATION ---
(function() {
    try {
        log('Initializing Attachment Remover extension...');
        // Load settings first so they are available immediately
        loadSettings();

        // Register the function that renders the extension's settings UI
        this.onSettingsDivRender = onSettingsDivRender;

        // If the extension was enabled in previous session, try to start the observer
        if (settings.enabled) {
            log('Extension was enabled, attempting to start observer...');
            startObserver();
        } else {
            log('Extension is disabled, observer will not start automatically. Enable it in settings if needed.');
        }

        // Register cleanup function to run before the page unloads
        window.addEventListener('beforeunload', cleanup);

        log('Attachment Remover extension initialized successfully.');
        
    } catch (error) {
        log(`Initialization failed: ${error.message}`, 'error');
    }
}).call(this); // Call the self-executing function with 'this' context for SillyTavern registration