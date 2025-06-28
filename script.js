(function () {
    // Extension-specific variables
    const EXTENSION_ID = 'auto-translate-clear';
    const AUTO_CLEAR_SETTING_KEY = `${EXTENSION_ID}_enabled`;
    let isAutoClearEnabled = localStorage.getItem(AUTO_CLEAR_SETTING_KEY) === 'true';

    // Function to clear translations from a single message element
    function clearMessageTranslation(messageElement) {
        // This is a crucial part that might need adjustment based on SillyTavern's DOM structure.
        // The existing "Clear Translations" button implies that original messages are preserved.
        // We'll look for elements that typically hold translated text and remove/hide them.

        // Common patterns for translated text:
        // 1. A span/div with a specific class indicating it's a translation.
        // 2. The original text is hidden, and the translated text is shown.
        // 3. The translated text is appended to the original.

        // Example: If translated text is in a span with class 'mes_translated'
        const translatedSpans = messageElement.querySelectorAll('.mes_translated');
        translatedSpans.forEach(span => {
            span.remove(); // Remove the translated span
        });

        // Example: If the original text is hidden and translated is shown,
        // you might need to toggle classes or display styles.
        // For instance, if original text has class 'original_text_hidden' and translated 'translated_text_visible'
        // messageElement.querySelectorAll('.original_text_hidden').forEach(el => el.style.display = '');
        // messageElement.querySelectorAll('.translated_text_visible').forEach(el => el.style.display = 'none');

        // If the translation is simply appended, you might need to revert innerHTML
        // This is more complex as it requires knowing the original content.
        // For simplicity, we'll stick to removing specific elements.

        // You might also need to remove any "Translate Message" action buttons if they become irrelevant
        // after clearing, or update their state.
    }

    // Function to clear all translations in the chat
    function clearAllChatTranslations() {
        const chatMessages = document.querySelectorAll('#chat .mes'); // Adjust selector if needed
        chatMessages.forEach(messageElement => {
            clearMessageTranslation(messageElement);
        });
        toastr.info('All translated chat messages cleared.');
    }

    // Function to update the button's appearance
    function updateButtonAppearance(button) {
        if (isAutoClearEnabled) {
            button.classList.add('active');
            button.title = 'Auto-clear translations: Enabled (click to disable)';
        } else {
            button.classList.remove('active');
            button.title = 'Auto-clear translations: Disabled (click to enable)';
        }
    }

    // Function to add the auto-clear button to a message's action bar
    function addAutoClearButton(messageElement) {
        // Find the message actions container. This selector is an educated guess.
        // You might need to inspect SillyTavern's DOM to find the correct selector.
        const messageActions = messageElement.querySelector('.mes_actions_buttons'); // Common class for action buttons
        if (messageActions && !messageElement.querySelector(`.${EXTENSION_ID}-button`)) {
            const autoClearButton = document.createElement('div');
            autoClearButton.classList.add('menu_button', 'fa-solid', 'fa-eraser', EXTENSION_ID + '-button'); // Using a FontAwesome icon
            autoClearButton.title = 'Toggle auto-clear translated chat';
            autoClearButton.style.cursor = 'pointer'; // Make it clear it's clickable

            updateButtonAppearance(autoClearButton);

            autoClearButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent other message actions from triggering
                isAutoClearEnabled = !isAutoClearEnabled;
                localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
                updateButtonAppearance(autoClearButton);
                toastr.info(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);

                if (isAutoClearEnabled) {
                    // Optionally clear existing translations when enabled
                    clearAllChatTranslations();
                }
            });

            // Find the "wand" (translate) button to insert next to it.
            // Assuming the translate button has a class like 'fa-wand-magic-sparkles' or similar.
            const translateButton = messageActions.querySelector('.fa-wand-magic-sparkles'); // Common icon for translate
            if (translateButton) {
                translateButton.parentNode.insertBefore(autoClearButton, translateButton.nextSibling);
            } else {
                // If translate button not found, just append to the actions
                messageActions.appendChild(autoClearButton);
            }
        }
    }

    // Observe new messages being added to the chat
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('mes')) { // Check if it's a message element
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

    // Start observing the chat container
    // You might need to adjust '#chat' if your chat container has a different ID/class
    const chatContainer = document.getElementById('chat');
    if (chatContainer) {
        observer.observe(chatContainer, { childList: true, subtree: true });
    } else {
        console.warn('SillyTavern Auto Translate Clear: Chat container not found. Extension might not function correctly.');
    }

    // Also add buttons to existing messages on load
    document.querySelectorAll('#chat .mes').forEach(addAutoClearButton);

    // Hook into SillyTavern's event system if available (more robust)
    // This is a hypothetical example, actual event names may vary.
    // if (typeof eventSource !== 'undefined') {
    //     eventSource.on('messageAdded', (data) => {
    //         const messageElement = document.getElementById(`mes_${data.id}`); // Assuming message has an ID
    //         if (messageElement) {
    //             addAutoClearButton(messageElement);
    //             if (isAutoClearEnabled) {
    //                 setTimeout(() => clearMessageTranslation(messageElement), 500);
    //             }
    //         }
    //     });
    // }

    // Add a global function to clear all translations, accessible via console or other extensions
    window.SillyTavern.extensions[EXTENSION_ID] = {
        clearAllTranslations: clearAllChatTranslations,
        toggleAutoClear: () => {
            isAutoClearEnabled = !isAutoClearEnabled;
            localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
            toastr.info(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);
            // Update all buttons if they exist
            document.querySelectorAll(`.${EXTENSION_ID}-button`).forEach(updateButtonAppearance);
            if (isAutoClearEnabled) {
                clearAllChatTranslations();
            }
        },
        isAutoClearEnabled: () => isAutoClearEnabled
    };

    console.log('SillyTavern Auto Translate Clear Extension Loaded.');
})();