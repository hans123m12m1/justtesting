// index.js for Attachment Remover Extension
// This file acts as the main entry point for the extension.

import { initializeExtension } from './content.js';

// When the document is fully loaded, initialize the extension.
$(document).ready(() => {
    // A small delay ensures that all of SillyTavern's core components are ready.
    setTimeout(async () => {
        try {
            // Call the main initialization function from content.js
            await initializeExtension();
        } catch (error) {
            console.error(`[AttachmentRemoverExt] A critical error occurred during initialization:`, error);
        }
    }, 1000);
});