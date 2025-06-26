// Smart Attachment Cleaner Extension for SillyTavern
// Automatically removes attachments after AI generation is completed

(() => {
    'use strict';

    // Ensure SillyTavern global object is available
    if (typeof SillyTavern === 'undefined') {
        console.error('SillyTavern object not found. Smart Attachment Cleaner extension cannot load.');
        return;
    }

    // Extension configuration
    let extensionConfig = SillyTavern.getExtensionConfig('smart-attachment-cleaner') || {};
    
    // Default configuration
    const defaultConfig = {
        enabled: true,
        removeAfterGeneration: true,
        removeFromHistory: false,
        showNotifications: true,
        cleanupDelay: 2000, // 2 seconds delay after generation
        preserveImportantFiles: true
    };

    // Merge with defaults
    extensionConfig = { ...defaultConfig, ...extensionConfig };

    // State variables
    let isGenerating = false;
    let pendingCleanup = new Set();
    let statusIndicator = null;

    // Save configuration
    function saveConfig() {
        SillyTavern.saveExtensionConfig('smart-attachment-cleaner', extensionConfig);
    }

    // Create status indicator
    function createStatusIndicator() {
        if (statusIndicator) return;

        statusIndicator = document.createElement('div');
        statusIndicator.id = 'attachment-cleaner-status';
        statusIndicator.className = 'attachment-cleaner-status';
        statusIndicator.innerHTML = `
            <i class="fa-solid fa-broom"></i>
            <span>Smart Cleaner: ${extensionConfig.enabled ? 'ON' : 'OFF'}</span>
        `;
        
        // Add to top bar or suitable location
        const topBar = document.querySelector('#top-bar') || document.querySelector('#main_controls');
        if (topBar) {
            topBar.appendChild(statusIndicator);
        }

        updateStatusIndicator();
    }

    // Update status indicator
    function updateStatusIndicator() {
        if (!statusIndicator) return;

        const span = statusIndicator.querySelector('span');
        const icon = statusIndicator.querySelector('i');
        
        if (extensionConfig.enabled) {
            statusIndicator.classList.add('enabled');
            statusIndicator.classList.remove('disabled');
            span.textContent = 'Smart Cleaner: ON';
            icon.className = 'fa-solid fa-broom';
        } else {
            statusIndicator.classList.add('disabled');
            statusIndicator.classList.remove('enabled');
            span.textContent = 'Smart Cleaner: OFF';
            icon.className = 'fa-solid fa-broom-ball';
        }
    }

    // Show notification
    function showNotification(message, type = 'info') {
        if (!extensionConfig.showNotifications) return;

        // Use SillyTavern's toast system if available
        if (typeof toastr !== 'undefined') {
            toastr[type](message, 'Smart Attachment Cleaner');
        } else {
            console.log(`[Smart Attachment Cleaner] ${message}`);
        }
    }

    // Check if file should be preserved
    function shouldPreserveFile(filename) {
        if (!extensionConfig.preserveImportantFiles) return false;
        
        const importantExtensions = ['.json', '.yaml', '.yml', '.config', '.settings'];
        const importantKeywords = ['character', 'preset', 'config', 'settings', 'backup'];
        
        const lowerFilename = filename.toLowerCase();
        
        return importantExtensions.some(ext => lowerFilename.endsWith(ext)) ||
               importantKeywords.some(keyword => lowerFilename.includes(keyword));
    }

    // Remove attachments from DOM
    function removeAttachmentsFromDOM(messageElement, messageId = null) {
        if (!messageElement) return 0;

        const attachmentSelectors = [
            '.message-attachment',
            '.image-container',
            '.file-attachment',
            '.img_container',
            '.attachment-wrapper',
            '.mes_img',
            '.mes_file',
            '[data-attachment]'
        ];

        let removedCount = 0;
        
        attachmentSelectors.forEach(selector => {
            const attachments = messageElement.querySelectorAll(selector);
            attachments.forEach(attachment => {
                // Check if we should preserve this attachment
                const filename = attachment.getAttribute('data-filename') || 
                               attachment.getAttribute('title') || 
                               attachment.textContent || '';
                
                if (extensionConfig.preserveImportantFiles && shouldPreserveFile(filename)) {
                    console.log(`[Smart Attachment Cleaner] Preserving important file: ${filename}`);
                    return;
                }

                attachment.style.transition = 'opacity 0.3s ease-out';
                attachment.style.opacity = '0';
                
                setTimeout(() => {
                    if (attachment.parentNode) {
                        attachment.remove();
                        removedCount++;
                        console.log(`[Smart Attachment Cleaner] Removed attachment: ${filename || 'unnamed'}`);
                    }
                }, 300);
            });
        });

        return removedCount;
    }

    // Clean message data
    function cleanMessageData(messageData) {
        if (!messageData || !extensionConfig.enabled) return;

        if (messageData.attachments && Array.isArray(messageData.attachments)) {
            const originalCount = messageData.attachments.length;
            
            if (extensionConfig.preserveImportantFiles) {
                messageData.attachments = messageData.attachments.filter(attachment => {
                    const filename = attachment.name || attachment.filename || '';
                    return shouldPreserveFile(filename);
                });
            } else {
                messageData.attachments = [];
            }

            const removedCount = originalCount - messageData.attachments.length;
            if (removedCount > 0) {
                console.log(`[Smart Attachment Cleaner] Cleaned ${removedCount} attachment(s) from message data`);
            }
        }

        // Clean other attachment properties
        ['images', 'files', 'media'].forEach(prop => {
            if (messageData[prop] && Array.isArray(messageData[prop])) {
                if (!extensionConfig.preserveImportantFiles) {
                    messageData[prop] = [];
                }
            }
        });
    }

    // Cleanup after generation
    function scheduleCleanup(messageElement, messageId) {
        if (!extensionConfig.enabled || !extensionConfig.removeAfterGeneration) return;

        setTimeout(() => {
            if (messageElement && messageElement.parentNode) {
                const removedCount = removeAttachmentsFromDOM(messageElement, messageId);
                if (removedCount > 0) {
                    showNotification(`Cleaned ${removedCount} attachment(s) after generation`, 'success');
                }
            }
            pendingCleanup.delete(messageId);
        }, extensionConfig.cleanupDelay);
    }

    // Initialize extension settings UI
    function initializeSettingsUI() {
        // Update checkboxes
        const enabledCheckbox = document.getElementById('smart-cleaner-enabled');
        const afterGenCheckbox = document.getElementById('smart-cleaner-after-gen');
        const fromHistoryCheckbox = document.getElementById('smart-cleaner-from-history');
        const notificationsCheckbox = document.getElementById('smart-cleaner-notifications');
        const preserveFilesCheckbox = document.getElementById('smart-cleaner-preserve-files');
        const delaySlider = document.getElementById('smart-cleaner-delay');
        const delayValue = document.getElementById('delay-value');

        if (enabledCheckbox) {
            enabledCheckbox.checked = extensionConfig.enabled;
            enabledCheckbox.addEventListener('change', (e) => {
                extensionConfig.enabled = e.target.checked;
                saveConfig();
                updateStatusIndicator();
                showNotification(`Smart Attachment Cleaner ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }

        if (afterGenCheckbox) {
            afterGenCheckbox.checked = extensionConfig.removeAfterGeneration;
            afterGenCheckbox.addEventListener('change', (e) => {
                extensionConfig.removeAfterGeneration = e.target.checked;
                saveConfig();
            });
        }

        if (fromHistoryCheckbox) {
            fromHistoryCheckbox.checked = extensionConfig.removeFromHistory;
            fromHistoryCheckbox.addEventListener('change', (e) => {
                extensionConfig.removeFromHistory = e.target.checked;
                saveConfig();
            });
        }

        if (notificationsCheckbox) {
            notificationsCheckbox.checked = extensionConfig.showNotifications;
            notificationsCheckbox.addEventListener('change', (e) => {
                extensionConfig.showNotifications = e.target.checked;
                saveConfig();
            });
        }

        if (preserveFilesCheckbox) {
            preserveFilesCheckbox.checked = extensionConfig.preserveImportantFiles;
            preserveFilesCheckbox.addEventListener('change', (e) => {
                extensionConfig.preserveImportantFiles = e.target.checked;
                saveConfig();
            });
        }

        if (delaySlider && delayValue) {
            delaySlider.value = extensionConfig.cleanupDelay;
            delayValue.textContent = `${extensionConfig.cleanupDelay}ms`;
            delaySlider.addEventListener('input', (e) => {
                extensionConfig.cleanupDelay = parseInt(e.target.value);
                delayValue.textContent = `${extensionConfig.cleanupDelay}ms`;
                saveConfig();
            });
        }

        // Manual cleanup button
        const manualCleanButton = document.getElementById('smart-cleaner-manual-clean');
        if (manualCleanButton) {
            manualCleanButton.addEventListener('click', () => {
                const messageElements = document.querySelectorAll('.mes');
                let totalRemoved = 0;
                
                messageElements.forEach(element => {
                    totalRemoved += removeAttachmentsFromDOM(element);
                });
                
                showNotification(`Manually cleaned ${totalRemoved} attachment(s) from chat`, 'info');
            });
        }
    }

    // Main initialization
    SillyTavern.on('ready', () => {
        console.log('[Smart Attachment Cleaner] Extension initializing...');
        
        const context = SillyTavern.getContext();
        
        // Create status indicator
        createStatusIndicator();
        
        // Initialize settings UI when settings panel is opened
        setTimeout(() => {
            initializeSettingsUI();
        }, 1000);

        // Hook into message events
        context.on('messageReceived', (data) => {
            if (!extensionConfig.enabled) return;
            
            cleanMessageData(data);
            
            if (data.is_user) {
                // User message - clean immediately if enabled
                setTimeout(() => {
                    const messageElements = document.querySelectorAll('.mes:last-child');
                    if (messageElements.length > 0) {
                        removeAttachmentsFromDOM(messageElements[0]);
                    }
                }, 100);
            }
        });

        context.on('messageAdded', (data) => {
            if (!extensionConfig.enabled) return;
            
            const messageElement = data.domElement || data.element;
            if (messageElement) {
                // If this is during generation, schedule cleanup for after
                if (isGenerating && !data.is_user) {
                    pendingCleanup.add(data.id || Date.now());
                    scheduleCleanup(messageElement, data.id);
                } else if (data.is_user) {
                    // Clean user messages immediately
                    setTimeout(() => removeAttachmentsFromDOM(messageElement), 100);
                }
            }
        });

        // Track generation state
        context.on('generation_started', () => {
            isGenerating = true;
            console.log('[Smart Attachment Cleaner] Generation started - scheduling cleanup');
        });

        context.on('generation_stopped', () => {
            isGenerating = false;
            console.log('[Smart Attachment Cleaner] Generation completed');
        });

        // Clean up on chat change
        context.on('chatChanged', () => {
            pendingCleanup.clear();
            if (extensionConfig.removeFromHistory) {
                setTimeout(() => {
                    const messageElements = document.querySelectorAll('.mes');
                    let totalRemoved = 0;
                    messageElements.forEach(element => {
                        totalRemoved += removeAttachmentsFromDOM(element);
                    });
                    if (totalRemoved > 0) {
                        showNotification(`Cleaned ${totalRemoved} attachment(s) from chat history`, 'info');
                    }
                }, 500);
            }
        });

        console.log('[Smart Attachment Cleaner] Extension ready!');
        showNotification('Smart Attachment Cleaner loaded successfully!', 'success');
    });

})();