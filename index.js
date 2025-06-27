// SillyTavern Extension: Attachment Remover
// This script automatically removes user-sent file/image attachments from the chat
// once the AI has sent its response, keeping the chat log cleaner.
// It also provides a toggle in the extension settings.

// --- CONFIGURATION: YOU MUST VERIFY THESE SELECTORS FOR YOUR SILLYTAVERN VERSION ---
// Use your browser's developer tools (F12) to inspect the HTML of your chat.

// Selector for the main chat messages container (where messages are added).
// Common examples: '#chat-log', '.messages-container', '[data-scroll-area="chat"]'
const CHAT_CONTAINER_SELECTOR = '#chat-log';

// Selector for individual message elements within the chat container.
// Common examples: '.message', '.chat-message', 'div.mes_container', '[data-message-id]'
const MESSAGE_SELECTOR = '.message';

// Selector for attachment elements within a user's message.
// This should target the actual image/file preview (e.g., an <img>, a <div> holding the thumbnail).
// Common examples: '.attachment-preview', 'img.file-preview', 'div.file-upload-thumbnail', '.attach_img'
const ATTACHMENT_SELECTOR = '.attachment-preview';

// Selector for identifying AI messages (e.g., a class on the AI message container).
// Common examples: '.ai-message', '.char-message', 'div.message_container.ai', '.bot_message'
const AI_MESSAGE_SELECTOR = '.ai-message';

// --- Extension State Management ---
// Unique key for localStorage to save settings
const SETTINGS_KEY = 'attachment_remover_settings';
let settings = {
    enabled: false
};

// Function to load settings from localStorage
function loadSettings() {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
            settings = { ...settings, ...JSON.parse(storedSettings) };
        }
    } catch (e) {
        console.error('Attachment Remover: Failed to load settings from localStorage', e);
    }
}

// Function to save settings to localStorage
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Attachment Remover: Failed to save settings to localStorage', e);
    }
}

// --- UI Interaction (for the settings.html checkbox) ---
function setupSettingsUI() {
    const enableCheckbox = document.getElementById('attachment_remover_enable');
    if (enableCheckbox) {
        // Set initial state of the checkbox
        enableCheckbox.checked = settings.enabled;

        // Add event listener to save state when checkbox changes
        enableCheckbox.addEventListener('change', (event) => {
            settings.enabled = event.target.checked;
            saveSettings();
            console.log(`Attachment Remover: Feature ${settings.enabled ? 'enabled' : 'disabled'}.`);
        });
        console.log('Attachment Remover: Settings UI initialized.');
    } else {
        console.warn('Attachment Remover: Could not find settings checkbox (#attachment_remover_enable).');
    }
}

// --- Core Logic: Attachment Removal ---
function processNewMessages() {
    if (!settings.enabled) {
        // If the feature is disabled, do nothing
        return;
    }

    const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
    if (!chatContainer) {
        console.warn('Attachment Remover: Chat container not found. Check CHAT_CONTAINER_SELECTOR in index.js.');
        return;
    }

    const messages = chatContainer.querySelectorAll(MESSAGE_SELECTOR);
    if (messages.length < 2) {
        // Need at least one user message and one AI message to trigger removal
        return;
    }

    // Check if the very last message added is an AI response
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.matches(AI_MESSAGE_SELECTOR)) {
        console.log('Attachment Remover: AI response detected. Checking for attachments...');

        // Look at the message(s) directly preceding the AI response for attachments.
        // It's common for attachments to be in the *immediately* preceding user message.
        // We iterate backwards to catch any user messages with attachments before the AI reply.
        for (let i = messages.length - 2; i >= 0; i--) {
            const potentialUserMessage = messages[i];

            // Find attachments within this message
            const attachments = potentialUserMessage.querySelectorAll(ATTACHMENT_SELECTOR);
            attachments.forEach(attachment => {
                console.log('Attachment Remover: Removing attachment:', attachment);
                attachment.remove(); // Completely remove the element from the DOM
            });

            // Optional: If you only want to remove from the *single* user message directly
            // preceding the AI's response, uncomment the 'break;' below.
            // If you want to clear attachments from *all* previous user messages in the same turn
            // (e.g., if you sent multiple attachments), leave it commented.
            // if (attachments.length > 0) {
            //     break; // Stop after finding/removing from the first relevant message
            // }
        }
    }
}

// --- MutationObserver to watch for new chat messages ---
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // A small delay might be necessary to ensure the message and its contents
            // (like the attachment preview) are fully rendered before we try to remove them.
            // Adjust the delay (in milliseconds) if attachments are sometimes missed.
            setTimeout(processNewMessages, 150); // 150ms delay
        }
    });
});

// Function to start observing the chat container
const startObservingChat = () => {
    const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
    if (chatContainer) {
        // Start observing for changes to the children of the chat container
        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('Attachment Remover: Observing chat container for new messages.');
    } else {
        // If chat container isn't ready yet (e.g., page still loading), retry after a delay
        console.warn('Attachment Remover: Chat container not found, retrying observation setup...');
        setTimeout(startObservingChat, 500); // Retry every 500ms
    }
};

// --- Main Extension Initialization ---
// This function runs when the extension is loaded by SillyTavern.
function initAttachmentRemover() {
    loadSettings();           // Load saved settings
    setupSettingsUI();        // Initialize the UI (checkbox)
    startObservingChat();     // Start watching the chat for changes
    console.log('Attachment Remover: Extension initialized.');
}

// Ensure the initialization runs once the DOM is fully loaded or immediately if already loaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAttachmentRemover);
} else {
    initAttachmentRemover();
}

// --- SillyTavern specific lifecycle hooks (optional but good practice) ---
// If SillyTavern provides a way to explicitly hook into its UI/chat events,
// you would use them here. For dynamic DOM changes, MutationObserver is often sufficient.

// Example: Registering a function to run when SillyTavern's chat is cleared
// (This is hypothetical, as specific event names vary by ST version/internal APIs)
// if (typeof API !== 'undefined' && API.events && API.events.on) {
//     API.events.on('chatCleared', () => {
//         console.log('Attachment Remover: Chat cleared event detected.');
//         // Re-evaluate or restart observer if needed, though it should persist.
//     });
// }