document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - Using a more robust way to get elements
    const DOMElements = {
        extensionToggle: document.getElementById('extensionToggle'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        saveBtn: document.getElementById('saveSettings'),
        notification: document.getElementById('notification'),
        notificationText: document.getElementById('notificationText'),
        configureBtn: document.getElementById('configureBtn'),
        exceptionPanel: document.getElementById('exceptionPanel'),
        exceptionList: document.getElementById('exceptionList'),
        newException: document.getElementById('newException'),
        addExceptionBtn: document.getElementById('addExceptionBtn'),
        testBtn: document.getElementById('testBtn'),
        cleanedChat: document.getElementById('cleanedChat'),
        filesRemoved: document.getElementById('filesRemoved'),
        storageSaved: document.getElementById('storageSaved'),
        imagesKept: document.getElementById('imagesKept'),
        preserveImages: document.getElementById('preserveImages'),
        showNotifications: document.getElementById('showNotifications')
    };

    // State Variables
    let filesRemovedCount = 0;
    let imagesKeptCount = 0;
    let currentExceptions = []; // To hold the parsed exceptions array

    // Initialize function
    function init() {
        loadSettings();
        updateCleanedChatPreview();
        attachEventListeners();
    }

    // Load saved settings from localStorage
    function loadSettings() {
        // General Settings
        const isEnabled = localStorage.getItem('attachmentCleanerEnabled') === 'true';
        if (DOMElements.extensionToggle) {
            DOMElements.extensionToggle.checked = isEnabled;
            updateStatus(isEnabled);
        }

        const preserveImagesSetting = localStorage.getItem('preserveImages');
        if (DOMElements.preserveImages && preserveImagesSetting !== null) {
            DOMElements.preserveImages.checked = preserveImagesSetting === 'true';
        }

        const showNotificationsSetting = localStorage.getItem('showNotifications');
        if (DOMElements.showNotifications && showNotificationsSetting !== null) {
            DOMElements.showNotifications.checked = showNotificationsSetting === 'true';
        }

        // Exceptions - Corrected default and parsing
        try {
            const storedExceptions = localStorage.getItem('exceptions');
            currentExceptions = storedExceptions ? JSON.parse(storedExceptions) : ['.txt', '.md'];
            // Ensure it's an array and contains valid strings
            if (!Array.isArray(currentExceptions) || !currentExceptions.every(item => typeof item === 'string')) {
                currentExceptions = ['.txt', '.md']; // Fallback if storage is corrupt
            }
        } catch (e) {
            console.error("Error parsing exceptions from localStorage, using default.", e);
            currentExceptions = ['.txt', '.md']; // Fallback on parsing error
        }
        renderExceptions(currentExceptions);

        // Load stats
        filesRemovedCount = parseInt(localStorage.getItem('filesRemovedCount') || '0', 10);
        imagesKeptCount = parseInt(localStorage.getItem('imagesKeptCount') || '0', 10);
        updateStats();
    }

    // Update status display
    function updateStatus(enabled) {
        if (DOMElements.statusDot && DOMElements.statusText) {
            DOMElements.statusDot.classList.toggle('active', enabled);
            DOMElements.statusText.textContent = enabled ? 'Enabled' : 'Disabled';
        }
    }

    // Update statistics display
    function updateStats() {
        if (DOMElements.filesRemoved && DOMElements.imagesKept && DOMElements.storageSaved) {
            DOMElements.filesRemoved.textContent = filesRemovedCount;
            DOMElements.imagesKept.textContent = imagesKeptCount;
            // Simplified storage saved calculation for demonstration
            DOMElements.storageSaved.textContent = `${Math.min(100, Math.floor(filesRemovedCount * 1.5))} MB Saved`; // Changed to MB for a more realistic feel
        }
    }

    // Render exceptions list
    function renderExceptions(exceptions) {
        if (DOMElements.exceptionList) {
            DOMElements.exceptionList.innerHTML = '';
            exceptions.forEach(ext => {
                const item = document.createElement('div');
                item.className = 'exception-item';
                item.innerHTML = `
                    <span>${ext} files</span>
                    <span class="remove-exception" data-extension="${ext}">✕</span>
                `;
                DOMElements.exceptionList.appendChild(item);
            });

            // Attach event listeners to remove buttons
            DOMElements.exceptionList.querySelectorAll('.remove-exception').forEach(btn => {
                btn.addEventListener('click', handleRemoveException);
            });
        }
    }

    // Handle removing an exception
    function handleRemoveException(event) {
        const extToRemove = event.target.dataset.extension;
        currentExceptions = currentExceptions.filter(ext => ext !== extToRemove);
        saveExceptions();
        renderExceptions(currentExceptions); // Re-render the list
        showNotification('Exception removed!');
    }

    // Save exceptions to localStorage
    function saveExceptions() {
        localStorage.setItem('exceptions', JSON.stringify(currentExceptions));
    }

    // Show notification
    function showNotification(message) {
        if (DOMElements.notification && DOMElements.notificationText && DOMElements.showNotifications && DOMElements.showNotifications.checked) {
            DOMElements.notificationText.textContent = message;
            DOMElements.notification.classList.add('show');

            setTimeout(() => {
                DOMElements.notification.classList.remove('show');
            }, 3000);
        }
    }

    // Update the cleaned chat preview
    function updateCleanedChatPreview() {
        if (DOMElements.cleanedChat) {
            DOMElements.cleanedChat.innerHTML = '';

            const preserveImagesChecked = DOMElements.preserveImages ? DOMElements.preserveImages.checked : false;

            // User message
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message';
            userMessage.innerHTML = `<div>Here's the document you requested!</div>`;
            DOMElements.cleanedChat.appendChild(userMessage);

            // PDF attachment (should be removed by default)
            const pdfAttachment = document.createElement('div');
            pdfAttachment.className = 'attachment removed'; // Always removed for preview
            pdfAttachment.dataset.type = 'pdf';
            pdfAttachment.innerHTML = `
                <div class="attachment-icon">📄</div>
                <div class="attachment-info">
                    <div class="attachment-name">Project_Report.pdf</div>
                    <div class="attachment-size">2.4 MB</div>
                </div>
            `;
            userMessage.appendChild(pdfAttachment);

            // Image attachment (status depends on 'Preserve Images' setting)
            const imageAttachment = document.createElement('div');
            imageAttachment.className = 'attachment' + (preserveImagesChecked ? '' : ' removed');
            imageAttachment.dataset.type = 'image';
            imageAttachment.innerHTML = `
                <div class="attachment-icon">📷</div>
                <div class="attachment-info">
                    <div class="attachment-name">diagram.png</div>
                    <div class="attachment-size">850 KB</div>
                </div>
            `;
            userMessage.appendChild(imageAttachment);

            // Bot message
            const botMessage = document.createElement('div');
            botMessage.className = 'message bot-message';
            botMessage.innerHTML = `<div>Thanks! I've also attached the presentation</div>`;
            DOMElements.cleanedChat.appendChild(botMessage);

            // Spreadsheet attachment (should be removed by default)
            const spreadsheetAttachment = document.createElement('div');
            spreadsheetAttachment.className = 'attachment removed'; // Always removed for preview
            spreadsheetAttachment.dataset.type = 'spreadsheet';
            spreadsheetAttachment.innerHTML = `
                <div class="attachment-icon">📊</div>
                <div class="attachment-info">
                    <div class="attachment-name">Analysis_Data.xlsx</div>
                    <div class="attachment-size">3.1 MB</div>
                </div>
            `;
            botMessage.appendChild(spreadsheetAttachment);

            // Another Image attachment (status depends on 'Preserve Images' setting)
            const imageAttachment2 = document.createElement('div');
            imageAttachment2.className = 'attachment' + (preserveImagesChecked ? '' : ' removed');
            imageAttachment2.dataset.type = 'image';
            imageAttachment2.innerHTML = `
                <div class="attachment-icon">📷</div>
                <div class="attachment-info">
                    <div class="attachment-name">chart.jpg</div>
                    <div class="attachment-size">720 KB</div>
                </div>
            `;
            botMessage.appendChild(imageAttachment2);
        }
    }

    // Simulate attachment cleaning
    function simulateAttachmentCleaning() {
        const preserveImagesChecked = DOMElements.preserveImages ? DOMElements.preserveImages.checked : false;

        // Simulate removing 2 non-image files and keeping 2 images if setting is on
        filesRemovedCount += 2; // PDF and Spreadsheet
        imagesKeptCount += (preserveImagesChecked ? 2 : 0); // Both images kept if setting is true

        localStorage.setItem('filesRemovedCount', filesRemovedCount);
        localStorage.setItem('imagesKeptCount', imagesKeptCount);

        updateStats();
        showNotification(`Test completed! ${filesRemovedCount} attachments removed, ${imagesKeptCount} images preserved.`);
        updateCleanedChatPreview(); // Refresh preview based on current settings
    }

    // Save all settings to localStorage
    function saveAllSettings() {
        if (DOMElements.extensionToggle && DOMElements.preserveImages && DOMElements.showNotifications) {
            localStorage.setItem('attachmentCleanerEnabled', DOMElements.extensionToggle.checked);
            localStorage.setItem('preserveImages', DOMElements.preserveImages.checked);
            localStorage.setItem('showNotifications', DOMElements.showNotifications.checked);
            // Exceptions are saved automatically by render/add/remove functions

            updateStatus(DOMElements.extensionToggle.checked);
            updateCleanedChatPreview(); // Update preview in case preserveImages changed
            showNotification('Settings saved successfully!');
        }
    }

    // Attach event listeners
    function attachEventListeners() {
        // Toggle extension status
        if (DOMElements.extensionToggle) {
            DOMElements.extensionToggle.addEventListener('change', function() {
                const enabled = this.checked;
                localStorage.setItem('attachmentCleanerEnabled', enabled);
                updateStatus(enabled);
                showNotification(`Extension ${enabled ? 'enabled' : 'disabled'}`);
            });
        }

        // Preserve Images setting change
        if (DOMElements.preserveImages) {
            DOMElements.preserveImages.addEventListener('change', function() {
                localStorage.setItem('preserveImages', this.checked);
                updateCleanedChatPreview(); // Update preview immediately
                showNotification(`Preserve Images ${this.checked ? 'enabled' : 'disabled'}`);
            });
        }

        // Show Notifications setting change
        if (DOMElements.showNotifications) {
            DOMElements.showNotifications.addEventListener('change', function() {
                localStorage.setItem('showNotifications', this.checked);
                showNotification(`Notifications ${this.checked ? 'enabled' : 'disabled'}`);
            });
        }

        // Configure exceptions button
        if (DOMElements.configureBtn && DOMElements.exceptionPanel) {
            DOMElements.configureBtn.addEventListener('click', function() {
                const isHidden = DOMElements.exceptionPanel.style.display === 'none';
                DOMElements.exceptionPanel.style.display = isHidden ? 'block' : 'none';
                this.textContent = isHidden ? 'Hide Exceptions' : 'Configure Exceptions';
                this.querySelector('.btn-icon').textContent = isHidden ? '➖' : '📋'; // Update icon
            });
        }

        // Add new exception
        if (DOMElements.addExceptionBtn && DOMElements.newException && DOMElements.exceptionList) {
            DOMElements.addExceptionBtn.addEventListener('click', function() {
                let ext = DOMElements.newException.value.trim().toLowerCase();
                if (!ext.startsWith('.')) { // Ensure it starts with a dot
                    ext = '.' + ext;
                }

                if (ext && !currentExceptions.includes(ext)) {
                    currentExceptions.push(ext);
                    saveExceptions();
                    renderExceptions(currentExceptions); // Re-render the list to show new item
                    DOMElements.newException.value = ''; // Clear input
                    showNotification('Exception added!');
                } else if (ext) {
                    showNotification('Exception already exists or invalid.');
                } else {
                    showNotification('Please enter a file extension.');
                }
            });
        }

        // Save settings button
        if (DOMElements.saveBtn) {
            DOMElements.saveBtn.addEventListener('click', saveAllSettings);
        }

        // Test button
        if (DOMElements.testBtn) {
            DOMElements.testBtn.addEventListener('click', simulateAttachmentCleaning);
        }
    }

    // Initial call to start the process
    init();
});