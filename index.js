// Ensure SillyTavern global object is available
if (typeof SillyTavern === 'undefined') {
    console.error('SillyTavern object not found. Is the extension loaded correctly?');
}

// Get the extension's configuration (defined in manifest.json and can be managed in ST UI)
let extensionConfig = SillyTavern.getExtensionConfig('message-attachment-cleaner');

// Initialize enabled state from config or default to false
let isEnabled = extensionConfig.enabled !== undefined ? extensionConfig.enabled : false;

// Function to update the button text and class to reflect the current state
function updateButtonUI() {
    const button = document.getElementById('toggleAttachmentCleaner');
    if (button) {
        button.textContent = `Attachment Cleaner: ${isEnabled ? 'Enabled' : 'Disabled'}`;
        if (isEnabled) {
            button.classList.remove('disabled');
            button.classList.add('enabled');
        } else {
            button.classList.remove('enabled');
            button.classList.add('disabled');
        }
    }
}

// Function to toggle the attachment cleaning functionality
function toggleAttachmentCleaner() {
    isEnabled = !isEnabled;
    extensionConfig.enabled = isEnabled; // Update the state in the config object
    SillyTavern.saveExtensionConfig('message-attachment-cleaner', extensionConfig); // Persist the config
    console.log(`Message Attachment Cleaner is now: ${isEnabled ? 'Enabled' : 'Disabled'}`);
    updateButtonUI();
}

// Function to remove attachments from a given message's DOM element
function removeAttachmentsFromDOM(messageElement) {
    // Common selectors for attachment containers in SillyTavern messages
    const attachmentContainers = messageElement.querySelectorAll('.message-attachment, .image-container, .file-attachment, .img_container');
    attachmentContainers.forEach(container => {
        container.remove();
        console.log('Removed attachment DOM element.');
    });
}

// This function runs when the extension is ready and SillyTavern's UI is loaded
SillyTavern.on('ready', () => {
    console.log('Message Attachment Cleaner extension ready!');
    const context = SillyTavern.getContext();

    // Find a suitable place to inject the toggle button.
    // The extension settings column is a good general spot.
    const settingsPanel = document.getElementById('extension_settings_column');

    if (settingsPanel) {
        const button = document.createElement('button');
        button.id = 'toggleAttachmentCleaner';
        button.onclick = toggleAttachmentCleaner;
        settingsPanel.prepend(button); // Add to the top of the settings column
        updateButtonUI(); // Set initial button state
    } else {
        console.warn('Could not find #extension_settings_column to append button. Trying #main_controls.');
        // Fallback: Try to add to the main controls if settings panel not found
        const mainControls = document.getElementById('main_controls');
        if (mainControls) {
            const button = document.createElement('button');
            button.id = 'toggleAttachmentCleaner';
            button.onclick = toggleAttachmentCleaner;
            mainControls.prepend(button);
            updateButtonUI();
        } else {
            console.error('Could not find a suitable place to inject the toggle button. Please adjust index.js.');
        }
    }

    // Hook into 'messageReceived' event: This event fires when message data is received
    // but possibly before it's fully rendered into the DOM. This is ideal for cleaning the data model.
    context.on('messageReceived', (data) => {
        if (isEnabled && data.attachments && data.attachments.length > 0) {
            console.log('Detected attachments in received message data. Clearing them...');
            data.attachments = []; // Clear attachments from the incoming message data object
        }
    });

    // Hook into 'messageAdded' event: This event fires when a message's DOM element is added to the chat.
    // This is a fallback to remove any attachment elements that might still render.
    context.on('messageAdded', (data) => {
        if (isEnabled) {
            // Check if data.domElement exists and has attachment-like content
            // The previous 'messageReceived' hook should ideally prevent most of this.
            if (data.domElement) {
                // We're checking the DOM directly here, in case the data model change didn't fully prevent rendering
                const attachmentElements = data.domElement.querySelectorAll('.message-attachment, .image-container, .file-attachment, .img_container');
                if (attachmentElements.length > 0) {
                    console.log('Detected attachment DOM elements after message added. Removing them...');
                    removeAttachmentsFromDOM(data.domElement);
                }
            } else {
                console.warn('DOM element not directly provided in messageAdded event. This might be an older SillyTavern version or different event behavior.');
                // As a last resort, if domElement isn't passed, try to find the last message element
                const messageElements = document.querySelectorAll('.mes_text'); // Common class for message text
                if (messageElements.length > 0) {
                    const lastMessageElement = messageElements[messageElements.length - 1];
                    removeAttachmentsFromDOM(lastMessageElement);
                }
            }
        }
    });
});