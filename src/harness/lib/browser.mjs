/**
 * browser.mjs — Chrome Resolution & Platform Launch Flags
 *
 * Resolves local Google Chrome / Chromium executable and applies platform-specific
 * WebGL and sandbox flags (Metal on macOS, D3D11 on Win32, ANGLE on Linux, SwiftShader fallback).
 */

import fs from 'fs';
import path from 'path';

export function findChromePath(customPath = null) {
  const candidates = [
    customPath,
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
    'C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft/Edge/Application/msedge.exe') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'BraveSoftware/Brave-Browser/Application/brave.exe') : null,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/microsoft-edge',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/brave-browser',
    '/usr/bin/brave',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (_) {}
  }

  return null;
}

export function getBrowserLaunchFlags({ softGl = false, gpuAngle = null } = {}) {
  const isWin   = process.platform === 'win32';
  const isMac   = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  const ANGLE = {
    d3d11:       ['--use-angle=d3d11'],
    metal:       ['--use-angle=metal'],
    gl:          ['--use-angle=gl'],
    vulkan:      ['--use-angle=vulkan'],
    swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  };

  const gpu = softGl
    ? ANGLE.swiftshader
    : gpuAngle && ANGLE[gpuAngle]
      ? ANGLE[gpuAngle]
      : isWin
        ? ANGLE.d3d11
        : isMac
          ? ANGLE.metal
          : ['--use-gl=angle'];

  const sandbox = isLinux ? ['--no-sandbox', '--disable-setuid-sandbox'] : [];

  return [
    ...sandbox,
    '--allow-file-access-from-files',
    '--disable-web-security',
    '--ignore-gpu-blocklist',
    ...gpu,
    '--enable-gpu-rasterization',
    '--window-size=1920,1080',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
    '--disable-gpu-watchdog',
    '--mute-audio',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--no-first-run',
    '--hide-scrollbars',
    '--disable-notifications',
    '--disable-component-update',
    '--disable-backgrounding-occluded-windows',
    '--disable-breakpad',
    '--disable-ipc-flooding-protection',
  ];
}

export async function launchHarnessBrowser(opts = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (err) {
    try {
      ({ chromium } = await import('playwright-core'));
    } catch (errCore) {
      throw new Error('Playwright is required. Run: npm install playwright && npx playwright install chromium');
    }
  }

  const execPath = findChromePath(opts.chromePath);
  const args = getBrowserLaunchFlags(opts);

  const launchOpts = {
    headless: opts.headless !== false,
    args: [...args, ...(opts.extraArgs || [])],
  };

  if (execPath) {
    launchOpts.executablePath = execPath;
  }

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (launchErr) {
    if ((launchErr.message || '').includes('playwright install') || (launchErr.message || '').includes('Executable')) {
      try {
        const { createRequire } = await import('module');
        const req = createRequire(import.meta.url);
        const { ensurePlaywrightChromium } = req('../../utils/tool-installer');
        if (ensurePlaywrightChromium()) {
          browser = await chromium.launch(launchOpts);
        } else {
          throw launchErr;
        }
      } catch (_) {
        throw launchErr;
      }
    } else {
      throw launchErr;
    }
  }

  return { browser, executablePath: execPath || 'bundled-chromium' };
}

export async function doctorBrowser(opts = {}) {
  const resolvedPath = findChromePath(opts.chromePath);
  const launchFlags = getBrowserLaunchFlags(opts);

  try {
    const { browser, executablePath } = await launchHarnessBrowser(opts);
    const page = await browser.newPage();
    const info = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { webgl: false, renderer: 'none', vendor: 'none' };
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        webgl: true,
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    });
    await browser.close();

    return {
      status: 'ok',
      chromePath: executablePath,
      webgl: info.webgl,
      renderer: info.renderer,
      vendor: info.vendor,
      flags: launchFlags,
    };
  } catch (err) {
    return {
      status: 'error',
      chromePath: resolvedPath,
      error: err.message,
      flags: launchFlags,
    };
  }
}

