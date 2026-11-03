// Isolated test profile only. No content scripts, network or persisted data.
/* global chrome */
chrome.runtime.onInstalled.addListener(() => {});
