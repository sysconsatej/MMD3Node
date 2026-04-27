import os from "os";

export const getExecutablePath = () => {
  const platform = os.platform();
  // OS-based fallback
  if (platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }

  if (platform === "linux") {
    return "/usr/bin/chromium-browser";
  }
  return undefined; // let Puppeteer decide
};
