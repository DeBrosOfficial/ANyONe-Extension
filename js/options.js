const proxyIP = document.getElementById("proxyIP");
const proxyPort = document.getElementById("proxyPort");
const noProxyFor = document.getElementById("noProxyFor");
const saveSettings = document.getElementById("saveSettings");
const disableProxy = document.getElementById("disableProxy");
const statusMessage = document.getElementById("statusMessage");
const checkAnyoneButton = document.getElementById('checkAnyoneButton');

// Validate IP address
function isValidIP(ip) {
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})$/;
  return ipRegex.test(ip);
}

// Validate port number
function isValidPort(port) {
  const num = parseInt(port, 10);
  return num > 0 && num <= 65535;
}

// Load saved settings on page load
chrome.storage.local.get(["proxyIP", "proxyPort", "proxyType", "noProxyFor"], (settings) => {
  if (chrome.runtime.lastError) {
    console.error("Error retrieving settings:", chrome.runtime.lastError);
    return;
  }
  proxyIP.value = settings.proxyIP || "";
  proxyPort.value = settings.proxyPort || "";
  noProxyFor.value = settings.noProxyFor || ""; 
});

// Function to check internet connectivity
function checkInternetConnection(host, port) {
  return new Promise((resolve, reject) => {
    const proxyConfig = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "socks5",
          host: host,
          port: parseInt(port, 10)
        },
        bypassList: [""]
      }
    };

    chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
        return;
      }

      fetch('https://doh.mullvad.net/dns-query?dns=q80BAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB', { 
        method: 'GET',
        mode: 'no-cors',
        headers: { 'accept': 'application/dns-message' }
      })
        .then(response => {
          if (response.ok) {
            resolve(true); // Connection successful
          } else {
            reject("Failed to connect via proxy"); // Connection failed
          }
        })
        .catch(error => {
          reject(error.message || "Network error encountered");
        });
    });
  });
}

// Function to apply Proxy Settings after saving
function applyProxySettings(host, port, exceptions = []) {
  const proxyConfig = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "socks5",
        host: host,
        port: parseInt(port, 10)
      },
      bypassList: exceptions.concat([""])
    }
  };

  chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, () => {
    if (chrome.runtime.lastError) {
      statusMessage.textContent = "Error applying proxy: " + chrome.runtime.lastError.message;
      statusMessage.style.color = "red";
      statusMessage.style.fontSize = "14px";
      statusMessage.style.fontFamily = "Arial";
      statusMessage.style.fontWeight = "bold";
    } else {
      console.log(`Proxy applied: ${host}:${port}`);
      statusMessage.textContent = `Proxy applied: ${host}:${port}`;
      statusMessage.style.color = "#2ecc71";
      statusMessage.style.fontSize = "16px";
      statusMessage.style.fontFamily = "Arial";
      statusMessage.style.fontWeight = "bold";
      clearStatusMessage();
    }
  });
}

// Function to clear status message after a delay
function clearStatusMessage() {
  setTimeout(() => {
    statusMessage.textContent = "";
  }, 5000); // Clear message after 5 seconds (5000 milliseconds)
}

// Save settings when clicking "Save Settings"
saveSettings.addEventListener("click", () => {
  if (!isValidIP(proxyIP.value)) {
    statusMessage.textContent = "Invalid IP address.";
    statusMessage.style.color = "red";
    statusMessage.style.fontSize = "16px";
    statusMessage.style.fontFamily = "Arial";
    statusMessage.style.fontWeight = "bold";
    return;
  }
  if (!isValidPort(proxyPort.value)) {
    statusMessage.textContent = "Invalid port number. Must be between 1 and 65535.";
    statusMessage.style.color = "red";
    statusMessage.style.fontSize = "14px";
    statusMessage.style.fontFamily = "Arial";
    statusMessage.style.fontWeight = "bold";
    return;
  }

  statusMessage.textContent = "Please wait...";
  statusMessage.style.color = "#f39c12";
  statusMessage.style.fontSize = "16px";
  statusMessage.style.fontFamily = "Arial";
  statusMessage.style.fontWeight = "bold";

  const noProxyExceptions = noProxyFor.value.split(',').map(ex => ex.trim());
  const filteredExceptions = noProxyExceptions.filter(ex => ex !== '');

  checkInternetConnection(proxyIP.value, proxyPort.value)
    .then(() => {
      chrome.storage.local.set({
        proxyIP: proxyIP.value,
        proxyPort: proxyPort.value,
        proxyType: "custom",
        noProxyFor: filteredExceptions.join(", "),
        proxyEnabled: true 
      }, () => {
        if (chrome.runtime.lastError) {
          statusMessage.textContent = "Error saving settings: " + chrome.runtime.lastError.message;
          statusMessage.style.color = "red";
          statusMessage.style.fontSize = "14px";
          statusMessage.style.fontFamily = "Arial";
          statusMessage.style.fontWeight = "bold";
        } else {
          statusMessage.textContent = "Proxy settings saved and connection verified!";
          statusMessage.style.color = "#2ecc71";
          statusMessage.style.fontSize = "16px";
          statusMessage.style.fontFamily = "Arial";
          statusMessage.style.fontWeight = "bold";
          applyProxySettings(proxyIP.value, proxyPort.value, filteredExceptions);
          chrome.runtime.sendMessage({ action: "updateProxy", type: "custom", proxy: { host: proxyIP.value, port: parseInt(proxyPort.value) }, exceptions: filteredExceptions });
          clearStatusMessage();
        }
      });
    })
    .catch((error) => {
      statusMessage.textContent = `Proxy connection failed: ${error}. Settings not applied.`;
      statusMessage.style.color = "red";
      statusMessage.style.fontSize = "14px";
      statusMessage.style.fontFamily = "Arial";
      statusMessage.style.fontWeight = "bold";
      chrome.proxy.settings.clear({});
    });
});

disableProxy.addEventListener("click", () => {
  chrome.proxy.settings.clear({}, () => {
    if (chrome.runtime.lastError) {
      statusMessage.textContent = "Error disabling proxy: " + chrome.runtime.lastError.message;
      statusMessage.style.color = "red";
      statusMessage.style.fontSize = "14px";
      statusMessage.style.fontFamily = "Arial";
      statusMessage.style.fontWeight = "bold";
    } else {
      statusMessage.textContent = "Proxy has been disabled!";
      statusMessage.style.color = "#e74c3c";
      statusMessage.style.fontSize = "16px";
      statusMessage.style.fontFamily = "Arial";
      statusMessage.style.fontWeight = "bold";
      clearStatusMessage();
      console.log("Proxy settings disabled.");
      chrome.storage.local.get(["noProxyFor"], (result) => {
        chrome.storage.local.set({ 
          proxyType: null, 
          noProxyFor: result.noProxyFor, 
          proxyEnabled: false 
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating storage:", chrome.runtime.lastError);
          } else {
            chrome.runtime.sendMessage({ action: "disableProxy" });
          }
        });
      });
      clearStatusMessage();
    }
  });
});

// Open Check Anyone page
checkAnyoneButton.addEventListener("click", () => {
  window.open("https://check.en.anyone.tech/", "_blank");
});