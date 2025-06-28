(function () {
    const EXTENSION_ID = 'auto-translate-clear';
    const AUTO_CLEAR_SETTING_KEY = `${EXTENSION_ID}_enabled`;
    let isAutoClearEnabled = localStorage.getItem(AUTO_CLEAR_SETTING_KEY) === 'true';

    // Function to clear translations from a single message element
    function clearMessageTranslation(messageElement) {
        const translatedSpans = messageElement.querySelectorAll('.mes_translated');
        translatedSpans.forEach(span => {
            span.remove();
        });
        // You might need to add more logic here based on how SillyTavern handles translations.
        // For example, if it adds a class to the message indicating translation, remove that class.
    }

    // Function to clear all translations in the chat
    function clearAllChatTranslations() {
        const chatMessages = document.querySelectorAll('#chat .mes');
        chatMessages.forEach(messageElement => {
            clearMessageTranslation(messageElement);
        });
        toastr.info('All translated chat messages cleared.');
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
        const messageActions = messageElement.querySelector('.mes_actions_buttons');
        if (messageActions && !messageElement.querySelector(`.${EXTENSION_ID}-button`)) {
            const autoClearButton = document.createElement('div');
            autoClearButton.classList.add('menu_button', 'fa-solid', 'fa-eraser', EXTENSION_ID + '-button');
            autoClearButton.title = 'Toggle auto-clear translated chat';
            autoClearButton.style.cursor = 'pointer';

            updateButtonAppearance(autoClearButton);

            autoClearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                isAutoClearEnabled = !isAutoClearEnabled;
                localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
                updateButtonAppearance(autoClearButton); // Update this specific button
                toastr.info(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);

                if (isAutoClearEnabled) {
                    clearAllChatTranslations();
                }
                // Notify the UI panel if it's open
                if (window.parent && window.parent.postMessage) {
                    window.parent.postMessage({ type: 'autoClearStateChange', enabled: isAutoClearEnabled }, '*');
                }
            });

            const translateButton = messageActions.querySelector('.fa-wand-magic-sparkles');
            if (translateButton) {
                translateButton.parentNode.insertBefore(autoClearButton, translateButton.nextSibling);
            } else {
                messageActions.appendChild(autoClearButton);
            }
        }
    }

    // Observe new messages being added to the chat
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('mes')) {
                        addAutoClearButton(node);
                        if (isAutoClearEnabled) {
                            setTimeout(() => clearMessageTranslation(node), 500);
                        }
                    }
                });
            }
        });
    });

    const chatContainer = document.getElementById('chat');
    if (chatContainer) {
        observer.observe(chatContainer, { childList: true, subtree: true });
    } else {
        console.warn('SillyTavern Auto Translate Clear: Chat container not found. Extension might not function correctly.');
    }

    // Add buttons to existing messages on load
    document.querySelectorAll('#chat .mes').forEach(addAutoClearButton);

    // Expose functions and state to the UI panel and other parts of SillyTavern
    window.SillyTavern.extensions[EXTENSION_ID] = {
        getAutoClearState: () => isAutoClearEnabled,
        toggleAutoClear: (newState) => {
            if (typeof newState === 'boolean') {
                isAutoClearEnabled = newState;
            } else {
                isAutoClearEnabled = !isAutoClearEnabled;
            }
            localStorage.setItem(AUTO_CLEAR_SETTING_KEY, isAutoClearEnabled);
            toastr.info(`Auto-clear translations: ${isAutoClearEnabled ? 'Enabled' : 'Disabled'}`);
            updateAllMessageButtons(); // Update all buttons on messages
            if (isAutoClearEnabled) {
                clearAllChatTranslations();
            }
        },
        clearAllTranslations: clearAllChatTranslations
    };

    console.log('SillyTavern Auto Translate Clear Extension Loaded.');
})();