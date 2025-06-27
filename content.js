// content.js for Attachment Remover Extension
 
// Import necessary SillyTavern objects/functions
import {
    saveSettingsDebounced,
    chat, // Import chat for cleanup
} from '../../../../script.js';
import {
    extension_settings,
    getContext, // Import getContext to access chat history
} from '../../../extensions.js';
 
// --- CONFIGURATION ---
const LOG_PREFIX = `[AttachmentRemoverExt]`;
const EXTENSION_NAME = "AttachmentRemover";
 
const SELECTORS = {
    settingsContainer: '.attachment-remover-settings',
    enableCheckbox: '#attachment_remover_enable',
    allMessagesCheckbox: '#attachment_remover_all_messages',
    imagesOnlyCheckbox: '#attachment_remover_images_only',
    preserveFirstCheckbox: '#attachment_remover_preserve_first',
    autoCleanupCheckbox: '#attachment_remover_auto_cleanup',
    debugModeCheckbox: '#attachment_remover_debug',
    manualButton: '#attachmentRemoverManualButton',
    chatContainer: '#chat',
    message: '.mes',
    userMessage: '.mes_right',
    aiMessage: '.mes_left',
    attachment: '.mes_img, .attachment_holder, .mes_file, .inline_image, img[src*="user_uploads"]',
    // UI Status / Stats Elements
    statusIcon: '#attachmentRemoverStatusIcon',
    statusText: '#attachmentRemoverStatusText',
    modeText: '#attachmentRemoverMode',
    removedCountStat: '#attachmentsRemovedCount',
    lastRemovalStat: '#lastRemovalTime',
};
 
const defaultSettings = {
    enable: false,
    allMessages: false,
    imagesOnly: false,
    preserveFirst: false,
    autoCleanup: false,
    debug: false,
    stats: {
        totalRemoved: 0,
        lastRemovalTimestamp: null,
    },
};
 
let currentSettings = { ...defaultSettings };
 
// --- HELPER FUNCTIONS ---
function ensureSettingsNamespace() {
    if (!extension_settings) return false;
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    return true;
}
 
function loadSettings() {
    if (ensureSettingsNamespace()) {
        // Deep merge to protect nested objects like 'stats'
        currentSettings = {
            ...defaultSettings,
            ...extension_settings[EXTENSION_NAME],
            stats: {
                ...defaultSettings.stats,
                ...(extension_settings[EXTENSION_NAME].stats || {}),
            },
        };
    }
    if (currentSettings.debug) console.log(`${LOG_PREFIX} Settings loaded:`, { ...currentSettings });
}
 
function saveSetting(key, value) {
    if (ensureSettingsNamespace()) {
        currentSettings[key] = value;
        extension_settings[EXTENSION_NAME][key] = value;
        saveSettingsDebounced();
        if (currentSettings.debug) console.log(`${LOG_PREFIX} Setting saved: ${key} = ${value}`);
        updateStatusUI(); // Update UI whenever a setting changes
    }
}
 
function saveStats() {
    if (ensureSettingsNamespace()) {
        extension_settings[EXTENSION_NAME].stats = currentSettings.stats;
        saveSettingsDebounced();
    }
}
 
function logDebug(message, ...args) {
    if (currentSettings.debug) {
        console.log(`${LOG_PREFIX} DEBUG: ${message}`, ...args);
    }
}
 
function findLastIndex(array, predicate) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (predicate(array[i])) {
            return i;
        }
    }
    return -1;
}
 
// --- CORE LOGIC ---
function removeAttachments(isManualRun = false) {
    if (!currentSettings.enable && !isManualRun) return;
 
    const context = getContext();
    if (!context || !context.chat) {
        logDebug("Context or chat not available.");
        return;
    }
 
    const messages = context.chat;
    const lastAiMessageIndex = findLastIndex(messages, msg => !msg.is_user);
    if (lastAiMessageIndex === -1 && !isManualRun) {
        logDebug('No AI message found to determine the current turn.');
        return;
    }
 
    // For manual runs, we want to clean everything up to the very last message.
    const startingIndex = isManualRun ? messages.length -1 : lastAiMessageIndex - 1;
 
    let attachmentsRemovedCount = 0;
 
    for (let i = startingIndex; i >= 0; i--) {
        const message = messages[i];
 
        // On automatic runs, stop at the previous AI message. On manual runs, don't.
        if (!isManualRun && !message.is_user && i !== lastAiMessageIndex) {
            logDebug(`Stopped at previous AI message (index ${i}).`);
            break;
        }
 
        if (!message.is_user) continue;
 
        const isFirstMessage = i === 0;
        if (currentSettings.preserveFirst && isFirstMessage) {
            logDebug('Preserving attachments in the first message.');
            continue;
        }
 
        // We check for 'extra.attachments' which is the source of truth
        if (!message.extra?.attachments?.length > 0) continue;
 
        logDebug(`Found ${message.extra.attachments.length} attachments in user message at index ${i}.`);
 
        const attachmentsToKeep = [];
        if (currentSettings.imagesOnly) {
            message.extra.attachments.forEach(att => {
                if (!att.type.startsWith('image/')) {
                    attachmentsToKeep.push(att);
                } else {
                    attachmentsRemovedCount++;
                    logDebug('Removing image attachment:', att.name);
                }
            });
        } else {
            attachmentsRemovedCount += message.extra.attachments.length;
            logDebug(`Removing all ${message.extra.attachments.length} attachments.`);
        }
 
        message.extra.attachments = attachmentsToKeep;
 
        // Find the corresponding DOM element and remove its visual attachments
        const messageElement = document.querySelector(`.mes[mesid="${message.id}"]`);
        if (messageElement) {
            messageElement.querySelectorAll(SELECTORS.attachment).forEach(el => {
                 const isImage = el.tagName === 'IMG' || el.classList.contains('mes_img') || el.classList.contains('inline_image');
                 if (!currentSettings.imagesOnly || isImage) {
                     el.remove();
                 }
            });
        }
 
 
        if (!currentSettings.allMessages && !isManualRun) {
            logDebug('Stopped after the most recent user message.');
            break;
        }
    }
 
    if (attachmentsRemovedCount > 0) {
        console.log(`${LOG_PREFIX} Successfully removed ${attachmentsRemovedCount} attachment(s).`);
        currentSettings.stats.totalRemoved += attachmentsRemovedCount;
        currentSettings.stats.lastRemovalTimestamp = Date.now();
        saveStats();
        updateStatsUI();
 
        if (currentSettings.autoCleanup) {
            if (typeof chat === 'object' && typeof chat.cleanupChat === 'function') {
                chat.cleanupChat();
                logDebug('Triggered chat cleanup after attachment removal.');
            }
        }
    } else if (isManualRun) {
        console.log(`${LOG_PREFIX} Manual run: No attachments found to remove based on current settings.`);
    }
}
 
// --- UI AND INITIALIZATION ---
function updateStatusUI() {
    const statusIcon = document.querySelector(SELECTORS.statusIcon);
    const statusText = document.querySelector(SELECTORS.statusText);
    const modeText = document.querySelector(SELECTORS.modeText);
 
    if (!statusIcon || !statusText || !modeText) return;
 
    if (currentSettings.enable) {
        statusIcon.textContent = '🟢';
        statusText.textContent = 'Extension Active';
        let modes = [];
        if (currentSettings.allMessages) modes.push('All Msgs');
        if (currentSettings.imagesOnly) modes.push('Images Only');
        if (currentSettings.preserveFirst) modes.push('Preserve First');
        modeText.textContent = modes.length > 0 ? modes.join(', ') : 'Default';
    } else {
        statusIcon.textContent = '🔴';
        statusText.textContent = 'Extension Disabled';
        modeText.textContent = 'Inactive';
    }
}
 
function updateStatsUI() {
    const removedCountEl = document.querySelector(SELECTORS.removedCountStat);
    const lastRemovalEl = document.querySelector(SELECTORS.lastRemovalStat);
 
    if (removedCountEl) {
        removedCountEl.textContent = currentSettings.stats.totalRemoved;
    }
    if (lastRemovalEl) {
        if (currentSettings.stats.lastRemovalTimestamp) {
            lastRemovalEl.textContent = new Date(currentSettings.stats.lastRemovalTimestamp).toLocaleTimeString();
        } else {
            lastRemovalEl.textContent = 'Never';
        }
    }
}
 
async function initializeAttachmentRemover() {
    console.log(`${LOG_PREFIX} Initializing extension...`);
 
    // Ensure the settings namespace exists
    ensureSettingsNamespace();
    loadSettings();
 
    // Inject the settings HTML
    try {
        const container = document.getElementById('extensions_settings');
        if (!container || document.querySelector(SELECTORS.settingsContainer)) {
            console.log(`${LOG_PREFIX} Settings UI already present or container not found.`);
            return;
        }
 
        const response = await fetch(`scripts/extensions/third-party/${EXTENSION_NAME}/settings.html`);
        if (!response.ok) {
            console.error(`${LOG_PREFIX} Failed to fetch settings.html:`, response.status, response.statusText);
            return;
        }
        const html = await response.text();
        container.insertAdjacentHTML('beforeend', html);
        logDebug('Settings UI injected.');
 
    } catch (error) {
        console.error(`${LOG_PREFIX} Error injecting settings UI:`, error);
        return; // Stop if UI fails to load
    }
 
    // Wire up UI elements
    const inputs = {