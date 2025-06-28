// floating_ui.js

document.addEventListener('DOMContentLoaded', function() {
    // Inject the floating UI HTML into the body
    const floatingUiHtml = `
        <div id="attachmentCleanerFloatingPanel" class="floating-panel">
            <div class="floating-panel-header">
                <h3>Cleaner UI</h3>
                <button id="floatingSettingsBtn" class="btn settings-btn" title="Open Settings">
                    ⚙️
                </button>
            </div>
            <div class="floating-panel-content">
                <div class="setting-item">
                    <label for="floatingExtensionToggle">Extension Status:</label>
                    <label class="switch">
                        <input type="checkbox" id="floatingExtensionToggle">
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="status-indicator">
                    <span id="floatingStatusDot" class="status-dot"></span>
                    <span id="floatingStatusText" class="status-text">Disabled</span>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', floatingUiHtml);

    // DOM Elements for the Floating UI
    const floatingPanel = document.getElementById('attachmentCleanerFloatingPanel');
    const floatingExtensionToggle = document.getElementById('floatingExtensionToggle');
    const floatingStatusDot = document.getElementById('floatingStatusDot');
    const floatingStatusText = document.getElementById('floatingStatusText');
    const floatingSettingsBtn = document.getElementById('floatingSettingsBtn');

    // Draggable State Variables
    let isDragging = false;
    let offsetX, offsetY;

    // --- Core Functions ---

    function loadFloatingUiState() {
        // Load enabled state
        const isEnabled = localStorage.getItem('attachmentCleanerEnabled') === 'true';
        floatingExtensionToggle.checked = isEnabled;
        updateFloatingStatus(isEnabled);
        toggleCleaningFunctionality(isEnabled); // Activate/deactivate cleaning

        // Load position
        const savedPosition = localStorage.getItem('floatingPanelPosition');
        if (savedPosition) {
            const { top, right } = JSON.parse(savedPosition);
            floatingPanel.style.top = top;
            floatingPanel.style.right = right;
            floatingPanel.style.bottom = 'unset'; // Clear bottom if top is set
            floatingPanel.style.left = 'unset';   // Clear left if right is set
        }
    }

    function updateFloatingStatus(enabled) {
        if (enabled) {
            floatingStatusDot.classList.add('active');
            floatingStatusText.textContent = 'Enabled';
            floatingStatusText.style.color = 'var(--success-color)';
            floatingPanel.classList.remove('disabled');
        } else {
            floatingStatusDot.classList.remove('active');
            floatingStatusText.textContent = 'Disabled';
            floatingStatusText.style.color = 'var(--danger-color)';
            floatingPanel.classList.add('disabled');
        }
    }

    // --- Dragging Functionality ---

    floatingPanel.addEventListener('mousedown', (e) => {
        // Only drag if clicking on the header or panel itself, not interactive elements
        if (e.target === floatingPanel || floatingPanel.contains(e.target) && !e.target.closest('button, input, label.switch')) {
            isDragging = true;
            floatingPanel.style.cursor = 'grabbing';

            // Calculate offsets relative to the panel's current position
            const panelRect = floatingPanel.getBoundingClientRect();
            offsetX = e.clientX - panelRect.left;
            offsetY = e.clientY - panelRect.top;

            // Ensure the panel is absolutely positioned for dragging
            floatingPanel.style.position = 'fixed';
            floatingPanel.style.right = 'unset';
            floatingPanel.style.bottom = 'unset';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Calculate new position
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;

        // Keep panel within viewport boundaries
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - floatingPanel.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - floatingPanel.offsetHeight));

        floatingPanel.style.left = `${newLeft}px`;
        floatingPanel.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            floatingPanel.style.cursor = 'grab';

            // Save the final position to localStorage
            const finalPosition = {
                top: floatingPanel.style.top,
                right: `${window.innerWidth - floatingPanel.getBoundingClientRect().right}px` // Recalculate right
            };
            localStorage.setItem('floatingPanelPosition', JSON.stringify(finalPosition));
        }
    });

    // --- Event Listeners ---

    floatingExtensionToggle.addEventListener('change', function() {
        const enabled = this.checked;
        localStorage.setItem('attachmentCleanerEnabled', enabled); // Update settings for both UIs
        updateFloatingStatus(enabled);
        toggleCleaningFunctionality(enabled);
    });

    floatingSettingsBtn.addEventListener('click', () => {
        // Open settings.html in a new tab/window
        window.open(chrome.runtime.getURL('settings.html') || 'settings.html', '_blank');
    });

    // --- Attachment Cleaning Logic (Placeholder) ---

    let cleaningObserver = null; // To hold the MutationObserver instance

    function toggleCleaningFunctionality(enabled) {
        if (enabled) {
            console.log("Attachment Cleaner: Functionality ENABLED.");
            // Here you'd typically start observing the chat DOM for new messages
            // and apply your cleaning logic.
            startChatMonitoring();
        } else {
            console.log("Attachment Cleaner: Functionality DISABLED.");
            // Stop observing or clean-up
            stopChatMonitoring();
        }
    }

    function startChatMonitoring() {
        // This is highly dependent on SillyTavern's DOM structure.
        // You'll need to inspect SillyTavern's chat container element.
        // Example: If chat messages are added to a div with ID 'chat-messages'
        const chatContainer = document.getElementById('chat-messages'); // Replace with actual ID/class
        if (!chatContainer) {
            console.warn("Attachment Cleaner: Chat container not found. Cleaning might not work.");
            // Fallback or attempt to find a common chat element like a `section`
            // You might need to look for elements with specific roles or data attributes
            // Example: try finding common chat elements by class like document.querySelector('.message-history')
            // For a browser extension, this would typically involve a content script
            // and listening for DOM mutations.
             return;
        }

        // Options for the observer (which mutations to observe)
        const config = { childList: true, subtree: true };

        // Callback function to execute when mutations are observed
        const callback = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        // Check if the added node is a message or contains attachments
                        // Again, actual selectors depend on SillyTavern's DOM
                        if (node.nodeType === 1 && node.querySelector && node.querySelector('.attachment-container')) {
                            console.log('New message or attachment detected. Applying cleaning...');
                            cleanAttachmentsInMessage(node);
                        } else if (node.nodeType === 1 && node.classList && node.classList.contains('message')) {
                             // If the node itself is a message, check its contents
                             console.log('New message detected. Checking for attachments...');
                             cleanAttachmentsInMessage(node);
                        }
                    });
                }
            }
        };

        // Create an observer instance linked to the callback function
        cleaningObserver = new MutationObserver(callback);

        // Start observing the target node for configured mutations
        cleaningObserver.observe(chatContainer, config);
        console.log("Attachment Cleaner: Monitoring chat for new messages/attachments.");

        // Also clean existing attachments on load, in case some are already there
        chatContainer.querySelectorAll('.attachment-container').forEach(cleanAttachmentsInMessage);
    }

    function stopChatMonitoring() {
        if (cleaningObserver) {
            cleaningObserver.disconnect();
            cleaningObserver = null;
            console.log("Attachment Cleaner: Stopped monitoring chat.");
        }
    }

    function cleanAttachmentsInMessage(messageElement) {
        // Retrieve exceptions from localStorage (fresh copy)
        const exceptions = JSON.parse(localStorage.getItem('exceptions') || '[]') || ['.txt', '.md'];
        const preserveImages = localStorage.getItem('preserveImages') === 'true';

        // Select all attachment elements within this message.
        // You'll need to adapt this selector to how SillyTavern renders attachments.
        // Look for common attachment patterns like <a> tags with specific classes,
        // or divs containing attachment info.
        // Example: attachments might be <div>s with class 'chat-attachment'
        const attachments = messageElement.querySelectorAll('.attachment'); // Based on your preview HTML structure

        attachments.forEach(attachment => {
            const attachmentName = attachment.querySelector('.attachment-name')?.textContent || '';
            const fileExtension = attachmentName.substring(attachmentName.lastIndexOf('.')).toLowerCase();
            const attachmentType = attachment.dataset.type; // From your preview HTML

            // Check if it's an image and if images should be preserved
            if (attachmentType === 'image' && preserveImages) {
                console.log(`Keeping image: ${attachmentName}`);
                // Ensure it doesn't have the 'removed' class if it was previously marked
                attachment.classList.remove('removed');
                // You might update image kept count here
                // imagesKeptCount++; // Need to manage this globally or via messages
                return; // Do not remove
            }

            // Check against exceptions
            if (exceptions.includes(fileExtension)) {
                console.log(`Keeping file (in exception list): ${attachmentName}`);
                attachment.classList.remove('removed');
                return; // Do not remove
            }

            // If not an image to preserve and not in exceptions, remove it.
            console.log(`Removing attachment: ${attachmentName}`);
            // Instead of just adding 'removed' class (which just styles it),
            // you might actually remove it from the DOM for true cleaning.
            // For now, let's just make it "appear" removed.
            attachment.classList.add('removed');

            // If you want to physically remove it:
            // attachment.remove();
            // filesRemovedCount++; // Need to manage this globally or via messages
        });

        // You might consider adding a "cleaned" class to the message itself
        // or update stats by sending messages back to the floating UI or settings page.
    }


    // --- Initialization ---
    loadFloatingUiState();
});