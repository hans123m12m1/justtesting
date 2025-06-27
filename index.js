// SillyTavern Extension: Attachment Remover

(function () {
    // --- !! CRITICAL CONFIGURATION !! ---
    // IF THE SCRIPT DOESN'T WORK, IT'S ALMOST CERTAINLY BECAUSE THESE SELECTORS ARE WRONG FOR YOUR VERSION OF SILLYTAVERN.
    // USE THE F12 DEVELOPER TOOLS IN YOUR BROWSER TO "INSPECT" THE CHAT AND FIND THE CORRECT SELECTORS.
    const SELECTORS = {
        // The entire chat area where all messages are displayed.
        CHAT_CONTAINER: '#chat-log',
        // Each individual message block (both user and AI).
        MESSAGE_BLOCK: '.message',
        // The specific element INSIDE a user message that contains the image/file preview.
        ATTACHMENT_PREVIEW: '.attachment-preview',
        // A class that is ONLY present on AI/bot messages.
        AI_MESSAGE_IDENTIFIER: '.ai-message',
    };

    // State management
    const SETTINGS_KEY = 'attachment_remover_settings';
    let settings = { enabled: false };

    function loadSettings() {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            settings = { ...settings, ...JSON.parse(stored) };
        }
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Core removal logic
    function removePreviousAttachments() {
        if (!settings.enabled) return;

        const chatContainer = document.querySelector(SELECTORS.CHAT_CONTAINER);
        if (!chatContainer) return;

        const messages = chatContainer.querySelectorAll(SELECTORS.MESSAGE_BLOCK);
        if (messages.length < 2) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.matches(SELECTORS.AI_MESSAGE_IDENTIFIER)) {
            // An AI message was just posted. Now look at the message before it.
            const userMessage = messages[messages.length - 2];
            
            // Check if the message before the AI's is NOT an AI message (i.e., it's a user message)
            if (!userMessage.matches(SELECTORS.AI_MESSAGE_IDENTIFIER)) {
                const attachments = userMessage.querySelectorAll(SELECTORS.ATTACHMENT_PREVIEW);
                if (attachments.length > 0) {
                    console.log(`Attachment Remover: AI response detected. Removing ${attachments.length} attachment(s) from previous message.`);
                    attachments.forEach(att => att.remove());
                }
            }
        }
    }

    // UI setup for the settings panel
    function setupSettingsUI() {
        const enableCheckbox = document.getElementById('attachment_remover_enable');
        if (enableCheckbox) {
            enableCheckbox.checked = settings.enabled;
            enableCheckbox.addEventListener('change', (event) => {
                settings.enabled = event.target.checked;
                saveSettings();
                console.log(`Attachment Remover: Feature ${settings.enabled ? 'ENABLED' : 'DISABLED'}.`);
            });
        }
    }

    // Observe the chat for new messages
    function startObserver() {
        const chatContainer = document.querySelector(SELECTORS.CHAT_CONTAINER);
        if (chatContainer) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        // A new message was added. Check if we need to remove an attachment.
                        // A small delay ensures the DOM is fully updated.
                        setTimeout(removePreviousAttachments, 100);
                        break; 
                    }
                }
            });
            observer.observe(chatContainer, { childList: true });
            console.log('Attachment Remover: Now observing the chat for new messages.');
        } else {
            // Retry if chat isn't loaded yet
            setTimeout(startObserver, 500);
        }
    }

    // Initialize the extension
    function init() {
        loadSettings();
        setupSettingsUI();
        startObserver();
        console.log('Attachment Remover: Extension Loaded.');
    }

    // Wait for the DOM to be ready before initializing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();