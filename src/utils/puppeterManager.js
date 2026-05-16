import puppeteer from "puppeteer";
import { getExecutablePath } from "./getExecutablePath.js";

let browserInstance = null;

export const getBrowser = async () => {
  if (browserInstance && !browserInstance.isConnected()) {
    browserInstance = null;
  }

  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      executablePath: getExecutablePath(),
    });
  }

  return browserInstance;
};


export const getPage = async () => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  return page;
};

