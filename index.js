import { extension_settings, getContext } from "../../../scripts/shared.js";

// --- CONFIGURATION: IF IT DOESN'T WORK, CHANGE THESE SELECTORS ---
const CHAT_CONTAINER_SELECTOR = '#chat-log';           // The entire chat area
const MESSAGE_SELECTOR = '.message';                   // A single message bubble
const ATTACHMENT_SELECTOR = '.attachment-preview';     // The attachment itself inside a message
const AI_MESSAGE_SELECTOR = '.ai-message';             // A message from the AI

// --- EXTENSION STATE ---
const SETTINGS_KEY = 'attachment_remover_settings';
const DEFAULT_SETTINGS = { enabled: false };
let settings = { ...DEFAULT_SETTINGS };

// --- CORE LOGIC ---
function processNewMessages() {
    if (!settings.enabled) return;

    const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
    if (!chatContainer) return;

    const messages = chatContainer.querySelectorAll(MESSAGE_SELECTOR);
    if (messages.length < 2) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.matches(AI_MESSAGE_SELECTOR)) {
        console.log('[Attachment Remover] AI response detected. Checking for attachments to remove.');

        for (let i = messages.length - 2; i >= 0; i--) {
            const userMessage = messages[i];
            if (userMessage.matches(AI_MESSAGE_SELECTOR)) break; // Stop if we hit a previous AI message

            const attachments = userMessage.querySelectorAll(ATTACHMENT_SELECTOR);
            if (attachments.length > 0) {
                attachments.forEach(attachment => {
                    console.log('[Attachment Remover] Removing attachment:', attachment);
                    attachment.remove(); // This is where the magic happens.
                });
                // Once we find and remove attachments from a user message, we stop.
                // This prevents it from continuing to scan up the whole chat history.
                break;
            }
        }
    }
}

// --- DOM OBSERVER ---
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            // A short delay ensures the DOM is fully updated before we check it.
            setTimeout(processNewMessages, 150);
            return;
        }
    }
});

function startObserver() {
    const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
    if (chatContainer) {
        observer.observe(chatContainer, { childList: true });
        console.log('[Attachment Remover] Observer started.');
    } else {
        // If chat isn't loaded yet, try again.
        setTimeout(startObserver, 500);
    }
}

// --- SETTINGS UI ---
function onSettingsChange() {
    settings.enabled = document.getElementById('attachment_remover_enable').checked;
    extension_settings.attachment_remover = settings;
    console.log(`[Attachment Remover] Settings updated. Enabled: ${settings.enabled}`);
}

function onSettingsDivRender(div) {
    // This is how you load external HTML and CSS into the settings panel.
    const context = getContext();
    const settingsHtmlPath = `extensions/attachment_remover/settings.html`;
    const settingsCssPath = `extensions/attachment_remover/styles.css`;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = settingsCssPath;
    document.head.appendChild(link);

    // Load HTML
    fetch(settingsHtmlPath)
        .then(response => response.text())
        .then(html => {
            div.innerHTML = html;
            // Now that the HTML is loaded, connect the UI elements
            document.getElementById('attachment_remover_enable').checked = settings.enabled;
            document.getElementById('attachment_remover_enable').addEventListener('change', onSettingsChange);
        })
        .catch(error => {
            console.error('[Attachment Remover] Failed to load settings HTML.', error);
            div.innerHTML = '<p>Error loading Attachment Remover settings.</p>';
        });
}

// --- INITIALIZATION ---
(function() {
    // Load saved settings when the extension starts.
    settings = { ...DEFAULT_SETTINGS, ...extension_settings.attachment_remover };

    // Register the function that will build the settings UI
    this.onSettingsDivRender = onSettingsDivRender;

    // Start the observer to watch the chat.
    startObserver();
    console.log('[Attachment Remover] Extension loaded.');
}).call(this);