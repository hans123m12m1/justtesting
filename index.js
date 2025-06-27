// index.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const extensionToggle = document.getElementById('extensionToggle');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const saveBtn = document.getElementById('saveSettings');
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const configureBtn = document.getElementById('configureBtn');
    const exceptionPanel = document.getElementById('exceptionPanel');
    const exceptionList = document.getElementById('exceptionList');
    const newException = document.getElementById('newException');
    const addExceptionBtn = document.getElementById('addExceptionBtn');
    const testBtn = document.getElementById('testBtn');
    const cleanedChat = document.getElementById('cleanedChat');
    const filesRemoved = document.getElementById('filesRemoved');
    const storageSaved = document.getElementById('storageSaved');
    const imagesKept = document.getElementById('imagesKept');
    const preserveImages = document.getElementById('preserveImages');
    const showNotifications = document.getElementById('showNotifications');

    // State
    let filesRemovedCount = 0;
    let imagesKeptCount = 0;

    // Initialize
    function init() {
        loadSettings();
        updateCleanedChatPreview();
        attachEventListeners();
    }

    // Load saved settings from localStorage
    function loadSettings() {
        const isEnabled = localStorage.getItem('attachmentCleanerEnabled') === 'true';
        if (extensionToggle) { // Add checks to ensure elements exist
            extensionToggle.checked = isEnabled;
            updateStatus(isEnabled);
        }

        const preserveImagesSetting = localStorage.getItem('preserveImages');
        if (preserveImages && preserveImagesSetting !== null) { // Add checks
            preserveImages.checked = preserveImagesSetting === 'true';
        }

        const showNotificationsSetting = localStorage.getItem('showNotifications');
        if (showNotifications && showNotificationsSetting !== null) { // Add checks
            showNotifications.checked = showNotificationsSetting === 'true';
        }

        // FIX: Corrected syntax for JSON.parse and default value
        const exceptions = JSON.parse(localStorage.getItem('exceptions') || '[]') || ['.txt', '.md'];
        renderExceptions(exceptions);

        // Load stats
        // FIX: Corrected syntax for parseInt and added radix
        filesRemovedCount = parseInt(localStorage.getItem('filesRemovedCount') || '0', 10);
        imagesKeptCount = parseInt(localStorage.getItem('imagesKeptCount') || '0', 10);
        updateStats();
    }

    // Update status display
    function updateStatus(enabled) {
        if (statusDot && statusText) { // Add checks
            if (enabled) {
                statusDot.classList.add('active');
                statusText.textContent = 'Enabled';
                statusText.style.color = '#4caf50';
            } else {
                statusDot.classList.remove('active');
                statusText.textContent = 'Disabled';
                statusText.style.color = '#f44336';
            }
        }
    }

    // Update statistics display
    function updateStats() {
        if (filesRemoved && imagesKept && storageSaved) { // Add checks
            filesRemoved.textContent = filesRemovedCount;
            imagesKept.textContent = imagesKeptCount;
            storageSaved.textContent = Math.min(100, Math.floor(filesRemovedCount * 1.5)) + '%';
        }
    }

    // Render exceptions list
    function renderExceptions(exceptions) {
        if (exceptionList) { // Add checks
            exceptionList.innerHTML = '';
            exceptions.forEach(ext => {
                const item = document.createElement('div');
                item.className = 'exception-item';
                item.innerHTML = `
                    <span>${ext} files</span>
                    <span class="remove-exception">✕</span>
                `;
                exceptionList.appendChild(item);
            });

            // Add event listeners to remove buttons
            document.querySelectorAll('.remove-exception').forEach(btn => {
                btn.addEventListener('click', function() {
                    this.closest('.exception-item').remove();
                    showNotification('Exception removed!');
                    saveExceptions();
                });
            });
        }
    }

    // Save exceptions to localStorage
    function saveExceptions() {
        if (exceptionList) { // Add checks
            const exceptions = Array.from(exceptionList.querySelectorAll('.exception-item span:first-child'))
                .map(el => el.textContent.replace(' files', ''));
            localStorage.setItem('exceptions', JSON.stringify(exceptions));
        }
    }

    // Show notification
    function showNotification(message) {
        if (notification && notificationText && showNotifications && showNotifications.checked) { // Add checks and check notification setting
            notificationText.textContent = message;
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    // Update the cleaned chat preview
    function updateCleanedChatPreview() {
        if (cleanedChat) { // Add checks
            cleanedChat.innerHTML = '';

            // User message
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.innerHTML = `
                <div>Here's the document you requested!</div>
            `;

            // PDF attachment (should be removed)
            const pdfAttachment = document.createElement('div');
            pdfAttachment.className = 'attachment removed';
            pdfAttachment.dataset.type = 'pdf';
            pdfAttachment.innerHTML = `
                <div class="attachment-icon">📄</div>
                <div class="attachment-info">
                    <div class="attachment-name">Project_Report.pdf</div>
                    <div class="attachment-size">2.4 MB</div>
                </div>
            `;
            userMessage.appendChild(pdfAttachment);

            // Image attachment (should be preserved)
            const imageAttachment = document.createElement('div');
             // Add condition to preserve images based on setting
            imageAttachment.className = 'attachment' + (preserveImages && preserveImages.checked ? '' : ' removed');
            imageAttachment.dataset.type = 'image';
            imageAttachment.innerHTML = `
                <div class="attachment-icon">📷</div>
                <div class="attachment-info">
                    <div class="attachment-name">diagram.png</div>
                    <div class="attachment-size">850 KB</div>
                </div>
            `;
            userMessage.appendChild(imageAttachment);

            cleanedChat.appendChild(userMessage);

            // Bot message
            const botMessage = document.createElement('div');
            botMessage.className = 'message bot-message';
            botMessage.innerHTML = `
                <div>Thanks! I've also attached the presentation</div>
            `;

            // Spreadsheet attachment (should be removed)
            const spreadsheetAttachment = document.createElement('div');
            spreadsheetAttachment.className = 'attachment removed';
            spreadsheetAttachment.dataset.type = 'spreadsheet';
            spreadsheetAttachment.innerHTML = `
                <div class="attachment-icon">📊</div>
                <div class="attachment-info">
                    <div class="attachment-name">Analysis_Data.xlsx</div>
                    <div class="attachment-size">3.1 MB</div>
                </div>
            `;
            botMessage.appendChild(spreadsheetAttachment);

            // Image attachment (should be preserved)
            const imageAttachment2 = document.createElement('div');
             // Add condition to preserve images based on setting
            imageAttachment2.className = 'attachment' + (preserveImages && preserveImages.checked ? '' : ' removed');
            imageAttachment2.dataset.type = 'image';
            imageAttachment2.innerHTML = `
                <div class="attachment-icon">📷</div>
                <div class="attachment-info">
                    <div class="attachment-name">chart.jpg</div>
                    <div class="attachment-size">720 KB</div>
                </div>
            `;
            botMessage.appendChild(imageAttachment2);

            cleanedChat.appendChild(botMessage);
        }
    }

    // Simulate attachment cleaning
    function simulateAttachmentCleaning() {
         // This simulation logic might need adjustment based on your actual cleaning logic
        filesRemovedCount += 2; // Assuming 2 files are removed in the simulation
        imagesKeptCount += (preserveImages && preserveImages.checked ? 2 : 0); // Assuming 2 images are kept if preserveImages is checked
        localStorage.setItem('filesRemovedCount', filesRemovedCount);
        localStorage.setItem('imagesKeptCount', imagesKeptCount);
        updateStats();
        showNotification(`Test completed! ${filesRemovedCount} attachments removed, ${imagesKeptCount} images preserved`);
    }


    // Save settings
    function saveSettings() {
        if (extensionToggle && preserveImages && showNotifications && exceptionList) { // Add checks
            const settings = {
                enabled: extensionToggle.checked,
                preserveImages: preserveImages.checked,
                showNotifications: showNotifications.checked,
                exceptions: Array.from(exceptionList.querySelectorAll('.exception-item span:first-child'))
                    .map(el => el.textContent.replace(' files', ''))
            };

            localStorage.setItem('attachmentCleanerEnabled', settings.enabled);
            localStorage.setItem('preserveImages', settings.preserveImages);
            localStorage.setItem('showNotifications', settings.showNotifications);
            localStorage.setItem('exceptions', JSON.stringify(settings.exceptions));

            updateStatus(settings.enabled);
            showNotification('Settings saved successfully!');
        }
    }

    // Attach event listeners
    function attachEventListeners() {
        // Toggle extension status
        if (extensionToggle) { // Add checks
            extensionToggle.addEventListener('change', function() {
                const enabled = this.checked;
                localStorage.setItem('attachmentCleanerEnabled', enabled);
                updateStatus(enabled);
                showNotification(`Extension ${enabled ? 'enabled' : 'disabled'}`);
            });
        }

        // Configure exceptions button
        if (configureBtn && exceptionPanel) { // Add checks
            configureBtn.addEventListener('click', function() {
                exceptionPanel.style.display = exceptionPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        // Add new exception
        if (addExceptionBtn && newException && exceptionList) { // Add checks
            addExceptionBtn.addEventListener('click', function() {
                const ext = newException.value.trim();
                if (ext && !Array.from(exceptionList.querySelectorAll('.exception-item span:first-child')).map(el => el.textContent.replace(' files', '')).includes(ext)) {
                    // FIX: Added a basic structure for adding a new exception
                    const item = document.createElement('div');
                    item.className = 'exception-item';
                    item.innerHTML = `
                        <span>${ext} files</span>
                        <span class="remove-exception">✕</span>
                    `;
                    exceptionList.appendChild(item);

                    // Add event listener to the new remove button
                    item.querySelector('.remove-exception').addEventListener('click', function() {
                         this.closest('.exception-item').remove();
                         showNotification('Exception removed!');
                         saveExceptions();
                    });

                    newException.value = ''; // Clear the input field
                    showNotification('Exception added!');
                    saveExceptions(); // Save the updated exceptions list
                } else if (ext) {
                    showNotification('Exception already exists.');
                } else {
                    showNotification('Please enter a file extension.');
                }
            });
        }

        // Save settings button
        if (saveBtn) { // Add checks
            saveBtn.addEventListener('click', saveSettings);
        }

        // Test button
        if (testBtn) { // Add checks
            testBtn.addEventListener('click', simulateAttachmentCleaning);
        }
    }

    // Initial call to start the process
    init();
});