let extStatus = 'on';

function redirect() {
  browser.tabs.update({ url: '/resources/redirect.html' });
}

function getStatus() {
  return extStatus;
}

function setBlocker() {
  browser.storage.local.get('sites').then((storage) => {
    const pattern = storage.sites.map(item => `*://*.${item}/*`);

    browser.webRequest.onBeforeRequest.removeListener(redirect);
    browser.webRequest.onBeforeRequest.addListener(
        redirect,
        { urls: pattern, types: ['main_frame'] },
        ['blocking'],
    );
  }).catch(() => {
    browser.storage.local.set({
      sites: [],
    });
  });
  extStatus = 'on';
}

function disableBlocker() {
  browser.webRequest.onBeforeRequest.removeListener(redirect);
  extStatus = 'off';
}

// initial run
setBlocker();

// then refresh the blocked websites if storage is updated
browser.storage.onChanged.addListener(setBlocker);

