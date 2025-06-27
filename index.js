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
        extensionToggle.checked = isEnabled;
        updateStatus(isEnabled);
        
        const preserveImagesSetting = localStorage.getItem('preserveImages');
        if (preserveImagesSetting !== null) {
            preserveImages.checked = preserveImagesSetting === 'true';
        }
        
        const showNotificationsSetting = localStorage.getItem('showNotifications');
        if (showNotificationsSetting !== null) {
            showNotifications.checked = showNotificationsSetting === 'true';
        }
        
        const exceptions = JSON.parse(localStorage.getItem('exceptions') || ['.txt', '.md'];
        renderExceptions(exceptions);
        
        // Load stats
        filesRemovedCount = parseInt(localStorage.getItem('filesRemovedCount') || 0;
        imagesKeptCount = parseInt(localStorage.getItem('imagesKeptCount') || 0;
        updateStats();
    }
    
    // Update status display
    function updateStatus(enabled) {
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
    
    // Update statistics display
    function updateStats() {
        filesRemoved.textContent = filesRemovedCount;
        imagesKept.textContent = imagesKeptCount;
        storageSaved.textContent = Math.min(100, Math.floor(filesRemovedCount * 1.5)) + '%';
    }
    
    // Render exceptions list
    function renderExceptions(exceptions) {
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
    
    // Save exceptions to localStorage
    function saveExceptions() {
        const exceptions = Array.from(exceptionList.querySelectorAll('.exception-item span:first-child'))
            .map(el => el.textContent.replace(' files', ''));
        localStorage.setItem('exceptions', JSON.stringify(exceptions));
    }
    
    // Show notification
    function showNotification(message) {
        notificationText.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Update the cleaned chat preview
    function updateCleanedChatPreview() {
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
        imageAttachment.className = 'attachment';
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
        imageAttachment2.className = 'attachment';
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
    
    // Simulate attachment cleaning
    function simulateAttachmentCleaning() {
        filesRemovedCount += 2;
        imagesKeptCount += 2;
        localStorage.setItem('filesRemovedCount', filesRemovedCount);
        localStorage.setItem('imagesKeptCount', imagesKeptCount);
        updateStats();
        showNotification('Test completed! 2 attachments removed, 2 images preserved');
    }
    
    // Save settings
    function saveSettings() {
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
    
    // Attach event listeners
    function attachEventListeners() {
        // Toggle extension status
        extensionToggle.addEventListener('change', function() {
            const enabled = this.checked;
            localStorage.setItem('attachmentCleanerEnabled', enabled);
            updateStatus(enabled);
            showNotification(`Extension ${enabled ? 'enabled' : 'disabled'}`);
        });
        
        // Configure exceptions button
        configureBtn.addEventListener('click', function() {
            exceptionPanel.style.display = exceptionPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Add new exception
        addExceptionBtn.addEventListener('click', function() {
            const ext = newException.value.trim();
            if (ext) {
                const formattedExt = ext.startsWith('.') ? ext : '.' + ext;
                
                const item = document.createElement('div');
                item.className = 'exception-item';
                item.innerHTML = `
                    <span>${formattedExt} files</span>
                    <span class="remove-exception">✕</span>
                `;
                
                item.querySelector('.remove-exception').addEventListener('click', function() {
                    item.remove();
                    saveExceptions();
                });
                
                exceptionList.appendChild(item);
                newException.value = '';
                
                saveExceptions();
                showNotification('Exception added!');
            }
        });
        
        // Save settings button
        saveBtn.addEventListener('click', saveSettings);
        
        // Test extension button
        testBtn.addEventListener('click', simulateAttachmentCleaning);
        
        // Press Enter to add exception
        newException.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addExceptionBtn.click();
            }
        });
    }
    
    // Initialize the extension
    init();
});