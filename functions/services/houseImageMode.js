'use strict';

/**
 * One authoritative server-side switch for automatic house-image processing.
 * off (default) | test (synthetic generated image) | licensed (Apple Look Around).
 * The legacy HOUSE_IMAGE_LOOKAROUND_ENABLED flag is not sufficient to enable
 * capture. Licensed mode requires two independent, explicit permission gates.
 */
function mode() {
    const value = String(process.env.HOUSE_IMAGE_PIPELINE_MODE || 'off').trim().toLowerCase();
    return ['off', 'test', 'licensed'].includes(value) ? value : 'off';
}
function licensedApproved() {
    return process.env.HOUSE_IMAGE_LICENSED_CAPTURE_AUTHORIZED === 'yes';
}
function processingAllowed() {
    return mode() === 'test' || (mode() === 'licensed' && licensedApproved());
}
module.exports = { mode, licensedApproved, processingAllowed };
