// SillyTavern Extension: Attachment Remover
// This script attempts to remove user-sent attachments from the chat
// once the AI has sent its response.

// !!! IMPORTANT: YOU MUST VERIFY THESE SELECTORS FOR YOUR SILLYTAVERN VERSION !!!
// Use your browser's developer tools (F12) to inspect the HTML and find the correct selectors.

// Selector for the main chat messages container (where messages are added)
// Example: '#chat-log', '.messages-container', '[data-scroll-area="chat"]'
const CHAT_CONTAINER_SELECTOR = '#chat-log'; // <-- *** VERIFY THIS ***

// Selector for individual message elements
// Example: '.message', '.chat-message', 'div.mes_container', '[data-message-id]'
const MESSAGE_SELECTOR = '.message'; // <-- *** VERIFY THIS ***

// Selector for attachment elements within a message
// This should target the actual image/file preview within the user's message.
// Example: '.attachment-preview', 'img.file-preview', 'div.file-upload-thumbnail'
const ATTACHMENT_SELECTOR = '.attachment-preview'; // <-- *** VERIFY THIS ***

// Selector for identifying AI messages (e.g., a class on the AI message container)
// Example: '.ai-message', '.char-message', 'div.message_container.ai'
const AI_MESSAGE_SELECTOR = '.ai-message'; // <-- *** VERIFY THIS ***


// --- Core Logic ---
function removeAttachments() {
    const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
    if (!chatContainer) {
        console.warn('SillyTavern Attachment Remover: Chat container not found. Check CHAT_CONTAINER_SELECTOR.');
        return;
    }

    // Get all messages. We'll usually look at the last few messages.
    const messages = chatContainer.querySelectorAll(MESSAGE_SELECTOR);
    if (messages.length < 2) {
        // Need at least one user message and one AI message to trigger
        return;
    }

    // Check the last message for being an AI response
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.matches(AI_MESSAGE_SELECTOR)) {
        console.log('SillyTavern Attachment Remover: AI response detected.');

        // Look at the message(s) preceding the AI response for attachments
        // It's safer to iterate backwards from the AI message to find the user message
        for (let i = messages.length - 2; i >= 0; i--) {
            const potentialUserMessage = messages[i];

            // Find attachments within this message
            const attachments = potentialUserMessage.querySelectorAll(ATTACHMENT_SELECTOR);
            attachments.forEach(attachment => {
                console.log('SillyTavern Attachment Remover: Removing attachment:', attachment);
                attachment.remove(); // Completely remove the element from the DOM
            });

            // If you only want to remove attachments from the immediately preceding user message,
            // you could add a 'break;' here after checking the first one.
            // Example:
            // if (attachments.length > 0) {
            //     break; // Stop after processing the first message with attachments
            // }
        }
    }
}

// Set up a MutationObserver to watch for new messages being added to the chat log.
// This is more efficient than polling.
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // A small delay might be necessary to ensure the message and its contents
            // (like the attachment) are fully rendered before we try to remove them.
            // Adjust the delay (in milliseconds) if attachments are sometimes missed.
            setTimeout(removeAttachments, 150); // 150ms delay
        }
    });
});

// Function to start observing the chat container
const startObservingChat = () => {
    const chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR);
    if (chatContainer) {
        // Start observing for changes to the children of the chat container
        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('SillyTavern Attachment Remover: Observing chat container for new messages.');
    } else {
        // If chat container isn't ready yet, retry after a short delay
        console.log('SillyTavern Attachment Remover: Chat container not found, retrying...');
        setTimeout(startObservingChat, 500); // Retry every 500ms
    }
};

// Initial call to start the observation process once the DOM is ready.
// The extension system usually handles this, but a direct call ensures it starts.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObservingChat);
} else {
    startObservingChat();
}

// You can add an optional listener for when the chat is cleared or reset
// This might be specific to SillyTavern's internal events.
// For now, the MutationObserver should be sufficient for dynamic message additions.