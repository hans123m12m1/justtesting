--- START OF FILE content.js ---
// Import necessary SillyTavern objects/functions
import {
    saveSettingsDebounced,
    eventSource,
    event_types,
} from '../../../../script.js';
import {
    extension_settings,
    getContext, // Keeping getContext just in case, though not strictly used for auto-clear
} from '../../../extensions.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js'; // Keeping for toastr fallback or general popups

// 0. DYNAMIC DEPENDENCY LOADING
// -----------------------------------------------------------------------------
const LOG_PREFIX = `[AutoTranslateClearExt]`;

// 1. CONFIGURATION
// -----------------------------------------------------------------------------
const EXTENSION_ID = "auto-translate-clear"; // Renamed from NEMO_EXTENSION_NAME
const AUTO_CLEAR_SETTING_KEY = `${EXTENSION_ID}_enabled`; // Key for localStorage

const SELECTORS = {
    chatMessagesContainer: '#chat', // The main chat container
    messageItem: '.mes', // Individual message element
    messageActionsButtons: '.mes_actions_buttons', // Container for message action buttons
    translateButtonIcon: '.fa-wand-magic-sparkles', // Icon for the translate button
    translatedTextClass: '.mes_translated', // Class for translated text (from previous response)
};

// State Variables
let isAutoClearEnabled = localStorage.getItem(AUTO_CLEAR_SETTING_KEY) === 'true';

// 2. UTILITY & HELPER FUNCTIONS
// -----------------------------------------------------------------------------
function ensureSettingsNamespace() {
    if (!extension_settings) return false;
    extension_settings[EXTENSION_ID] = extension_settings[EXTENSION_ID] || {};
    return true;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

// Function to show a toast message (using SillyTavern's toastr if available)
function showToast(message, type = 'info') {
    if (typeof toastr !== 'undefined') {
        toastr[type](message);
    } else {
        console.log(`${LOG_PREFIX} ${type.toUpperCase()}: ${message}`);
    }
}

// NEW: Function to inject the stylesheet
function injectStylesheet() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = `scripts/extensions/third-party/${EXTENSION_ID}/styles.css`;
    document.head.appendChild(link);
    console.log(`${LOG_PREFIX} Injected styles.css`);
}

// 3. AUTO-CLEAR TRANSLATION LOGIC
// -----------------------------------------------------------------------------

// Function to clear translations from a single message element
function clearMessageTranslation(messageElement) {
    const translatedSpans = messageElement.querySelectorAll(SELECTORS.translatedTextClass);
    translatedSpans.forEach(span => {
        span.remove(); // Remove the translated span
    });

    // If there's a "Clear Translations" button that needs to be clicked
    // or a class that needs to be removed to revert to original text, add that here.
    // Based on the previous response, simply removing the .mes_translated span is the approach.
}

// Function to clear all translations in the chat
function clearAllChatTranslations() {
    const chatMessages = document.querySelectorAll(`${SELECTORS.chatMessagesContainer} ${SELECTORS.messageItem}`);
    chatMessages.forEach(messageElement => {
        clearMessageTranslation(messageElement);
    });
    showToast('All translated chat messages cleared.', 'success');
}

// Function to update the button's appearance on a single button element
function updateButtonAppearance(button) {
    if (isAutoClearEnabled) {
        button.classList.add('active');
        button.title = 'Auto-clear translations: Enabled (click to disable)';
    } else {
        button.classList.remove('active');
        button.title = 'Auto-clear translations: Disabled (click to enable)';
    }
}

// Function to update the appearance of ALL auto-clear buttons on messages
function updateAllMessageButtons() {
    document.querySelectorAll(`.${EXTENSION_ID}-button`).forEach(updateButtonAppearance);
}

// Function to add the auto-clear button to a message's action bar
function addAutoClearButton(messageElement) {
    const messageActions = messageElement.querySelector(SELECTORS.messageActionsButtons);
    // Ensure the button doesn't already exist for this message
    if (messageActions && !messageElement.querySelector(`.${EXTENSION_ID}-button`)) {
        const autoClearButton = document.createElement('div');
        autoClearButton.classList.add('menu_button', 'fa-solid', 'fa-eraser', `${EXTENSION_ID}-button`); // Using a FontAwesome icon
        autoClearButton.title = 'Toggle auto-clear translated chat';
        autoClearButton.style.cursor = 'pointer'; // Make it clear it's clickable

        updateButtonAppearance(autoClearButton);

        autoClearButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent other message actions from triggering
            isAutoClearEnabled = !isAutoClearEnabled;
            localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
            updateButtonAppearance(autoClearButton); // Update this specific button
            showToast(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);

            if (isAutoClearEnabled) {
                // Optionally clear existing translations when enabled
                clearAllChatTranslations();
            }
            // Notify the UI panel if it's open
            if (window.frames && window.frames.length > 0) {
                // Iterate through iframes to find the settings panel
                for (let i = 0; i < window.frames.length; i++) {
                    try {
                        if (window.frames[i].location.href.includes('settings.html')) { // Check if it's our panel
                            window.frames[i].postMessage({ type: 'autoClearStateChange', enabled: isAutoClearEnabled }, '*');
                            break;
                        }
                    } catch (e) {
                        // Cross-origin frame access might throw an error, ignore.
                    }
                }
            }
        });

        // Find the "wand" (translate) button to insert next to it.
        const translateButton = messageActions.querySelector(SELECTORS.translateButtonIcon);
        if (translateButton) {
            translateButton.parentNode.insertBefore(autoClearButton, translateButton.nextSibling);
        } else {
            // If translate button not found, just append to the actions
            messageActions.appendChild(autoClearButton);
        }
    }
}

// 4. INITIALIZATION & UI INJECTION
// -----------------------------------------------------------------------------

// This function will be called when the settings panel is loaded.
// It injects the HTML for the settings panel.
async function initializeSettingsUI() {
    const container = document.getElementById('extensions_settings');
    // Check if our settings UI is already injected to prevent duplicates
    if (container && !document.querySelector('.auto-clear-translation-settings')) {
        ensureSettingsNamespace();
        const response = await fetch(`scripts/extensions/third-party/${EXTENSION_ID}/settings.html`);
        if (!response.ok) {
            console.error(`${LOG_PREFIX} Failed to fetch settings.html`);
            return;
        }
        container.insertAdjacentHTML('beforeend', await response.text());

        // The script for handling UI interactions is now embedded directly in settings.html
        // so we don't need to add event listeners here for the settings panel.
    }
}

// Main initialization function for the extension
$(document).ready(() => {
    setTimeout(async function() {
        try {
            console.log(`${LOG_PREFIX} Initializing...`);
            ensureSettingsNamespace();

            // NEW: Inject the stylesheet at the start
            injectStylesheet();

            // Expose functions and state to the UI panel and other parts of SillyTavern
            // This is crucial for the settings.html to interact with this script.
            window.SillyTavern.extensions[EXTENSION_ID] = {
                getAutoClearState: () => isAutoClearEnabled,
                toggleAutoClear: (newState) => {
                    if (typeof newState === 'boolean') {
                        isAutoClearEnabled = newState;
                    } else {
                        isAutoClearEnabled = !isAutoClearEnabled;
                    }
                    localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
                    showToast(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);
                    updateAllMessageButtons(); // Update all buttons on messages
                    if (isAutoClearEnabled) {
                        clearAllChatTranslations();
                    }
                    // No need to postMessage back to settings.html here, as the change
                    // originated from settings.html or the message button itself.
                },
                clearAllTranslations: clearAllChatTranslations
            };

            // Observe new messages being added to the chat
            const chatContainer = document.querySelector(SELECTORS.chatMessagesContainer);
            if (chatContainer) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach((node) => {
                                // Check if it's a message element
                                if (node.nodeType === 1 && node.classList.contains('mes')) {
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
                observer.observe(chatContainer, { childList: true, subtree: true });
            } else {
                console.warn(`${LOG_PREFIX} Chat container not found. Auto-clear button might not appear.`);
            }

            // Add buttons to existing messages on load
            document.querySelectorAll(`${SELECTORS.chatMessagesContainer} ${SELECTORS.messageItem}`).forEach(addAutoClearButton);

            // Initialize the settings UI panel
            await initializeSettingsUI();

            console.log(`${LOG_PREFIX} Initialization complete.`);
        } catch (error) {
            console.error(`${LOG_PREFIX} Critical failure during initialization:`, error);
        }
    }, 1000); // Small delay to ensure SillyTavern's core UI is ready
});
--- END OF FILE content.js ---