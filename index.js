--- START OF FILE content.js ---
// Import necessary Sil---

### 4. `content.js` (Refactored Main Logic)

This is the core JavaScript file. It has been heavily refactored to remove all "NemoPresetExt" specific features (like prompt organizationlyTavern objects/functions
import {
    saveSettingsDebounced,
    eventSource,
    event_types,
} from '../../../../script.js';
import {
    extension_settings,
    getContext, //, snapshots, navigator modal, etc.) and now focuses solely on the auto-clear translation functionality and integrating with the new `settings.html` panel.

 Keeping getContext just in case, though not strictly used for auto-clear
} from '../../../extensions.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js'; // Keeping for toastr fallback or general popups

// 0. DYNAMIC DEPENDENCY LOADING
// -----------------------------------------------------------------------------
const LOG_PREFIX = `[AutoTranslateClearExt]`;

// 1. CONFIGURATION
// ------------------------------------------------```javascript
--- START OF FILE content.js ---
// Import necessary Sil-----------------------------
const EXTENSION_ID = "auto-translate-clear"; // Renamed from NEMO_EXTENSION_NAME
const AUTO_CLEAR_SETTING_KEY = `${EXTENSION_ID}_enabled`; // Key for localStoragelyTavern objects/functions
import {
    saveSettingsDebounced,
    eventSource,
    event_types,
} from '../../../../script.js';
import {
    extension_settings,
    getContext, //

const SELECTORS = {
    chatMessagesContainer: '#chat', // The main chat container
    messageItem: '.mes', // Individual message element
    messageActionsButtons: '.mes_actions_buttons', // Container for message action Keeping getContext just in case, though not strictly used for auto-clear
} from '../../../extensions.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js'; // Keeping for toastr fallback or general popups

// 0. DYNAMIC DEPENDENCY LOADING
// -----------------------------------------------------------------------------
const LOG_PREFIX = `[AutoTranslateClearExt]`;

// 1. CONFIGURATION
// -----------------------------------------------------------------------------
const EXTENSION_ID = "auto-translate-clear"; // Renamed from NEMO_EXTENSION_NAME
const AUTO_CLEAR_SETTING_KEY = `${EXTENSION_ID}_enabled`; // Key for localStorage buttons
    translateButtonIcon: '.fa-wand-magic-sparkles', // Icon for the translate button
    translatedTextClass: '.mes_translated', // Class for translated text (from previous response)
};

// State Variables
let isAutoClearEnabled = localStorage.getItem(AUTO_CLEAR_SETTING_KEY) === 'true';

// 2. UTILITY & HELPER FUNCTIONS
// -----------------------------------------------------------------------------
function ensure

const SELECTORS = {
    chatMessagesContainer: '#chat', // The main chat container
    messageItem: '.mes', // Individual message element
    messageActionsButtons: '.mes_actions_buttons', // Container for message actionSettingsNamespace() {
    if (!extension_settings) return false;
    extension_settings[EXTENSION_ID] = extension_settings[EXTENSION_ID] || {};
    return true;
}

const delay = ms buttons
    translateButtonIcon: '.fa-wand-magic-sparkles', // Icon for the translate button
    translatedTextClass: '.mes_translated', // Class for translated text (from previous response)
};

// => new Promise(res => setTimeout(res, ms));

// Function to show a toast message (using SillyTavern's toastr if available)
function showToast(message, type = 'info') {
 State Variables
let isAutoClearEnabled = localStorage.getItem(AUTO_CLEAR_SETTING_KEY) === 'true';

// 2. UTILITY & HELPER FUNCTIONS
// -----------------------------------------------------------------------------
function ensure    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else {
        console.log(`${LOG_PREFIX} ${type.toUpperCase()}: ${message}`);
    }
SettingsNamespace() {
    if (!extension_settings) return false;
    extension_settings[EXTENSION_ID] = extension_settings[EXTENSION_ID] || {};
    return true;
}

const delay = ms}

// 3. AUTO-CLEAR TRANSLATION LOGIC
// -----------------------------------------------------------------------------

// Function to clear translations from a single message element
function clearMessageTranslation(messageElement) {
    const translatedSp => new Promise(res => setTimeout(res, ms));

// Function to show a toast message (using SillyTavern's toastr if available)
function showToast(message, type = 'info') {
ans = messageElement.querySelectorAll(SELECTORS.translatedTextClass);
    translatedSpans.forEach(span => {
        span.remove(); // Remove the translated span
    });

    // If there's a "Clear Translations" button that needs to be clicked
    // or a class that needs to be removed to revert to original text, add that here.
    // Based on the previous response, simply removing the .mes_translated span is    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else {
        console.log(`${LOG_PREFIX} ${type.toUpperCase()}: ${message}`);
    }
 the approach.
}

// Function to clear all translations in the chat
function clearAllChatTranslations() {
    const chatMessages = document.querySelectorAll(`${SELECTORS.chatMessagesContainer} ${SELECTORS.messageItem}`);
}

// 3. AUTO-CLEAR TRANSLATION LOGIC
// -----------------------------------------------------------------------------

// Function to clear translations from a single message element
function clearMessageTranslation(messageElement) {
    const translatedSpans = messageElement.querySelectorAll(SELECTORS.translatedTextClass);
    translatedSpans.forEach(span => {
        span.remove(); // Remove the translated span
    });

    // If there's a "    chatMessages.forEach(messageElement => {
        clearMessageTranslation(messageElement);
    });
    showToast('All translated chat messages cleared.', 'success');
}

// Function to update the button's appearanceClear Translations" button that needs to be clicked
    // or a class that needs to be removed to revert to original text, add that here.
    // Based on the previous response, simply removing the .mes_translated span is on a single button element
function updateButtonAppearance(button) {
    if (isAutoClearEnabled) {
        button.classList.add('active');
        button.title = 'Auto-clear translations: Enabled ( the approach.
}

// Function to clear all translations in the chat
function clearAllChatTranslations() {
    const chatMessages = document.querySelectorAll(`${SELECTORS.chatMessagesContainer} ${SELECTORS.messageItem}`);
click to disable)';
    } else {
        button.classList.remove('active');
        button.title = 'Auto-clear translations: Disabled (click to enable)';
    }
}

// Function to update the    chatMessages.forEach(messageElement => {
        clearMessageTranslation(messageElement);
    });
    showToast('All translated chat messages cleared.', 'success');
}

// Function to update the button's appearance appearance of ALL auto-clear buttons on messages
function updateAllMessageButtons() {
    document.querySelectorAll(`.${EXTENSION_ID}-button`).forEach(updateButtonAppearance);
}

// Function to add the auto-clear button on a single button element
function updateButtonAppearance(button) {
    if (isAutoClearEnabled) {
        button.classList.add('active');
        button.title = 'Auto-clear translations: Enabled ( to a message's action bar
function addAutoClearButton(messageElement) {
    const messageActions = messageElement.querySelector(SELECTORS.messageActionsButtons);
    // Ensure the button doesn't already exist forclick to disable)';
    } else {
        button.classList.remove('active');
        button.title = 'Auto-clear translations: Disabled (click to enable)';
    }
}

// Function to update the this message
    if (messageActions && !messageElement.querySelector(`.${EXTENSION_ID}-button`)) {
        const autoClearButton = document.createElement('div');
        autoClearButton.classList.add('menu appearance of ALL auto-clear buttons on messages
function updateAllMessageButtons() {
    document.querySelectorAll(`.${EXTENSION_ID}-button`).forEach(updateButtonAppearance);
}

// Function to add the auto-clear button_button', 'fa-solid', 'fa-eraser', `${EXTENSION_ID}-button`); // Using a FontAwesome icon
        autoClearButton.title = 'Toggle auto-clear translated chat';
        autoClearButton. to a message's action bar
function addAutoClearButton(messageElement) {
    const messageActions = messageElement.querySelector(SELECTORS.messageActionsButtons);
    // Ensure the button doesn't already exist forstyle.cursor = 'pointer'; // Make it clear it's clickable

        updateButtonAppearance(autoClearButton);

        autoClearButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent this message
    if (messageActions && !messageElement.querySelector(`.${EXTENSION_ID}-button`)) {
        const autoClearButton = document.createElement('div');
        autoClearButton.classList.add('menu other message actions from triggering
            isAutoClearEnabled = !isAutoClearEnabled;
            localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
            updateButtonAppearance(autoClearButton);_button', 'fa-solid', 'fa-eraser', `${EXTENSION_ID}-button`); // Using a FontAwesome icon
        autoClearButton.title = 'Toggle auto-clear translated chat';
        autoClearButton. // Update this specific button
            showToast(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);

            if (isAutoClearEnabled) {
                // Optionally clear existing translations when enabledstyle.cursor = 'pointer'; // Make it clear it's clickable

        updateButtonAppearance(autoClearButton);

        autoClearButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent
                clearAllChatTranslations();
            }
            // Notify the UI panel if it's open
            if (window.frames && window.frames.length > 0) {
                // Iterate through iframes to find the settings panel
                for (let i = 0; i < window.frames.length; i++) {
                    try {
                        if (window.frames[i].location.href.includes('settings.html other message actions from triggering
            isAutoClearEnabled = !isAutoClearEnabled;
            localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
            updateButtonAppearance(autoClearButton); // Update this specific button
            showToast(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);

            if (isAutoClearEnabled) {
                // Optionally clear existing translations when enabled')) { // Check if it's our panel
                            window.frames[i].postMessage({ type: 'autoClearStateChange', enabled: isAutoClearEnabled }, '*');
                            break;
                        }
                    }
                clearAllChatTranslations();
            }
            // Notify the UI panel if it's open
            if (window.frames && window.frames.length > 0) {
                // Iterate through iframes to catch (e) {
                        // Cross-origin frame access might throw an error, ignore.
                    }
                }
            }
        });

        // Find the "wand" (translate) button to insert next to find the settings panel
                for (let i = 0; i < window.frames.length; i++) {
                    try {
                        if (window.frames[i].location.href.includes('settings.html it.
        const translateButton = messageActions.querySelector(SELECTORS.translateButtonIcon);
        if (translateButton) {
            translateButton.parentNode.insertBefore(autoClearButton, translateButton.nextSibling);
')) { // Check if it's our panel
                            window.frames[i].postMessage({ type: 'autoClearStateChange', enabled: isAutoClearEnabled }, '*');
                            break;
                        }
                    }        } else {
            // If translate button not found, just append to the actions
            messageActions.appendChild(autoClearButton);
        }
    }
}

// 4. INITIALIZATION & UI INJECTION catch (e) {
                        // Cross-origin frame access might throw an error, ignore.
                    }
                }
            }
        });

        // Find the "wand" (translate) button to insert next to
// -----------------------------------------------------------------------------

// This function will be called when the settings panel is loaded.
// It injects the HTML for the settings panel.
async function initializeSettingsUI() {
    const container = document it.
        const translateButton = messageActions.querySelector(SELECTORS.translateButtonIcon);
        if (translateButton) {
            translateButton.parentNode.insertBefore(autoClearButton, translateButton.nextSibling);
.getElementById('extensions_settings');
    // Check if our settings UI is already injected to prevent duplicates
    if (container && !document.querySelector('.auto-clear-translation-settings')) {
        ensureSettingsNamespace();
        } else {
            // If translate button not found, just append to the actions
            messageActions.appendChild(autoClearButton);
        }
    }
}

// 4. INITIALIZATION & UI INJECTION        const response = await fetch(`scripts/extensions/third-party/${EXTENSION_ID}/settings.html`);
        if (!response.ok) {
            console.error(`${LOG_PREFIX} Failed to fetch settings.html
// -----------------------------------------------------------------------------

// This function will be called when the settings panel is loaded.
// It injects the HTML for the settings panel.
async function initializeSettingsUI() {
    const container = document`);
            return;
        }
        container.insertAdjacentHTML('beforeend', await response.text());

        // The script for handling UI interactions is now embedded directly in settings.html
        // so we don't need.getElementById('extensions_settings');
    // Check if our settings UI is already injected to prevent duplicates
    if (container && !document.querySelector('.auto-clear-translation-settings')) {
        ensureSettingsNamespace();
 to add event listeners here for the settings panel.
    }
}

// Main initialization function for the extension
$(document).ready(() => {
    setTimeout(async function() {
        try {
            console.log        const response = await fetch(`scripts/extensions/third-party/${EXTENSION_ID}/settings.html`);
        if (!response.ok) {
            console.error(`${LOG_PREFIX} Failed to fetch settings.html(`${LOG_PREFIX} Initializing...`);
            ensureSettingsNamespace();

            // Expose functions and state to the UI panel and other parts of SillyTavern
            // This is crucial for the settings.html to`);
            return;
        }
        container.insertAdjacentHTML('beforeend', await response.text());

        // The script for handling UI interactions is now embedded directly in settings.html
        // so we don't need interact with this script.
            window.SillyTavern.extensions[EXTENSION_ID] = {
                getAutoClearState: () => isAutoClearEnabled,
                toggleAutoClear: (newState) => { to add event listeners here for the settings panel.
    }
}

// Main initialization function for the extension
$(document).ready(() => {
    setTimeout(async function() {
        try {
            console.log
                    if (typeof newState === 'boolean') {
                        isAutoClearEnabled = newState;
                    } else {
                        isAutoClearEnabled = !isAutoClearEnabled;
                    }
                    localStorage.setItem(AUTO(`${LOG_PREFIX} Initializing...`);
            ensureSettingsNamespace();

            // Expose functions and state to the UI panel and other parts of SillyTavern
            // This is crucial for the settings.html to_CLEAR_SETTING_KEY, isAutoClearEnabled);
                    showToast(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);
                    updateAllMessageButtons(); // Update all buttons interact with this script.
            window.SillyTavern.extensions[EXTENSION_ID] = {
                getAutoClearState: () => isAutoClearEnabled,
                toggleAutoClear: (newState) => { on messages
                    if (isAutoClearEnabled) {
                        clearAllChatTranslations();
                    }
                    // No need to postMessage back to settings.html here, as the change
                    // originated from settings.html
                    if (typeof newState === 'boolean') {
                        isAutoClearEnabled = newState;
                    } else {
                        isAutoClearEnabled = !isAutoClearEnabled;
                    }
                    localStorage.setItem(AUTO or the message button itself.
                },
                clearAllTranslations: clearAllChatTranslations
            };

            // Observe new messages being added to the chat
            const chatContainer = document.querySelector(SELECTORS.chatMessages_CLEAR_SETTING_KEY, isAutoClearEnabled);
                    showToast(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);
                    updateAllMessageButtons(); // Update all buttonsContainer);
            if (chatContainer) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && on messages
                    if (isAutoClearEnabled) {
                        clearAllChatTranslations();
                    }
                    // No need to postMessage back to settings.html here, as the change
                    // originated from settings.html mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach((node) => {
                                // Check if it's a message element
                                if (node.nodeType === 1 && node or the message button itself.
                },
                clearAllTranslations: clearAllChatTranslations
            };

            // Observe new messages being added to the chat
            const chatContainer = document.querySelector(SELECTORS.chatMessages.classList.contains('mes')) {
                                    addAutoClearButton(node);
                                    if (isAutoClearEnabled) {
                                        // Give a small delay to allow translation extension to apply its changes
                                        setTimeout(() => clearMessageTranslation(node), 500);
                                    }
                                }
                            });
                        }
                    });
                });
                observer.observe(chatContainer, { childList: true,Container);
            if (chatContainer) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && subtree: true });
            } else {
                console.warn(`${LOG_PREFIX} Chat container not found. Auto-clear button might not appear.`);
            }

            // Add buttons to existing messages on load
            document mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach((node) => {
                                // Check if it's a message element
                                if (node.nodeType === 1 && node.classList.contains('mes')) {
                                    addAutoClearButton(node);
                                    if (isAutoClearEnabled) {
                                        // Give a small delay to allow translation extension to apply its changes
                                        .querySelectorAll(`${SELECTORS.chatMessagesContainer} ${SELECTORS.messageItem}`).forEach(addAutoClearButton);

            // Initialize the settings UI panel
            await initializeSettingsUI();

            console.log(`${LOG_PREFIX} Initialization complete.`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Critical failure during initialization:`, error);
        }
    }, 1000); // Small delay to ensure SilsetTimeout(() => clearMessageTranslation(node), 500);
                                    }
                                }
                            });
                        }
                    });
                });
                observer.observe(chatContainer, { childList: true,lyTavern's core UI is ready
});
--- END OF FILE content.js ---
``` subtree: true });
            } else {
                console.warn(`${LOG_PREFIX} Chat container not found. Auto-clear button might not appear.`);
            }

            // Add buttons to existing messages on load
            document.querySelectorAll(`${SELECTORS.chatMessagesContainer} ${SELECTORS.messageItem}`).forEach(addAutoClearButton);

            // Initialize the settings UI panel
            await initializeSettingsUI();

            console.log(`${LOG_PREFIX

---

### Installation Steps:

1.  **Create Extension Folder:** In your SillyTavern installation directory} Initialization complete.`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Critical failure during initialization:`, error);
        }
    }, 1000); // Small delay to ensure Sil, navigate to the `extensions` folder. Create a new subfolder named `auto-translate-clear`.
2.  **Save Files:**
    *   Save the `info.json` content into `auto-translate-clearlyTavern's core UI is ready
});
--- END OF FILE content.js ---