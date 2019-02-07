import ImpulseBlocker from './ImpulseBlocker';

import MessageTypes from './enums/messages';
import ExtensionStatus from './enums/extensionStatus';
import SettingTypes from './enums/settings';
import StorageHandler from './storage/StorageHandler';
import Website from './storage/Website';
import DomainParser from './utils/DomainParser';

const blocker = new ImpulseBlocker();
blocker.start();

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === MessageTypes.GET_CURRENT_DOMAIN) {
    sendResponse(DomainParser.getCurrentDomain());
    return;
  }

  if (request.type === MessageTypes.IS_DOMAIN_BLOCKED) {
    sendResponse(StorageHandler.isDomainBlocked(request.domain));
    return;
  }

  if (request.type === MessageTypes.GET_EXTENSION_STATUS) {
    return Promise.all([blocker.getStatus(), blocker.getSettings()]).then(
      values => ({
        extensionStatus: values[0].status,
        extensionSettings: values[1].extensionSettings,
        pausedUntil: blocker.getPausedUntil(),
      }),
    );
  }

  if (request.type === MessageTypes.UPDATE_EXTENSION_STATUS) {
    if (request.parameter === ExtensionStatus.ON) {
      // TODO: Return true or false according to the setBlocker function. If it fails to turn on (for example listener can not be added)
      // it should return false
      blocker.setStatus(ExtensionStatus.ON);
      sendResponse(true);
      return;
    }

    if (request.parameter === ExtensionStatus.OFF) {
      // TODO: Return true or false according to the setBlocker function. If it fails to turn off
      // (for example listener can not be removed) it should return false
      blocker.stop();
      sendResponse(true);
      return;
    }
  }

  if (request.type === MessageTypes.START_BLOCKING_DOMAIN) {
    ImpulseBlocker.addWebsite(request.domain.replace(/^www\./, ''));
    sendResponse(true);
    return;
  }

  if (request.type === MessageTypes.START_ALLOWING_DOMAIN) {
    ImpulseBlocker.removeWebsite(request.domain.replace(/^www\./, ''));
    sendResponse(true);
    return;
  }

  if (request.type === MessageTypes.GET_BLOCKED_DOMAINS_LIST) {
    sendResponse(StorageHandler.getWebsiteDomains());
    return;
  }

  if (request.type === MessageTypes.PAUSE_BLOCKER) {
    blocker.pause(request.duration);
    sendResponse(true);
    return;
  }

  if (request.type === MessageTypes.UNPAUSE_BLOCKER) {
    blocker.unpause();
    sendResponse(true);
    return;
  }

  if (request.type === MessageTypes.UPDATE_EXTENSION_SETTING) {
    return blocker.updateSettings(request.key, request.value);
  }

  throw new Error('Message type not recognized');
});

/**
 * In versions before 1.0, the blocked website domains were stores as array of strings
 * like ["example.com", "example2.com"]. To contain metadata about the blocked
 * websites we should convert the old structure to be array ob objects.
 * Website model represents that object in storage.
 */
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get('sites').then(storage => {
    if (Array.isArray(storage.sites)) {
      const updatedSitesArray = storage.sites.map(url => {
        if (typeof url === 'string') {
          return Website.create(url);
        }

        return url;
      });

      return browser.storage.local.set({
        sites: updatedSitesArray,
      });
    }

    // if the user is installed the extension first time, we should create the sites key in the storage
    if (!Array.isArray(storage.sites)) {
      return browser.storage.local.set({ sites: [] });
    }
  });

  browser.storage.local.get('extensionSettings').then(storage => {
    if (!Array.isArray(storage.extensionSettings)) {
      return browser.storage.local.set({
        extensionSettings: [
          {
            key: SettingTypes.SHOW_ON_OFF_BUTTONS_IN_POPUP,
            value: SettingTypes.ON,
          },
        ],
      });
    }
  });

  browser.storage.local.get('status').then(storage => {
    if (!Array.isArray(storage.status)) {
      return browser.storage.local.set({ status: ExtensionStatus.ON });
    }
  });
});
