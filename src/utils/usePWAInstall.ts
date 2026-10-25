import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

declare global {
  interface Window {
    deferredPWAInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.deferredPWAInstallPrompt) {
      return window.deferredPWAInstallPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone PWA mode (already running as installed app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // Detect Electron Windows Desktop Application
    const electronDetected = Boolean(
      (window as unknown as { turfbdDesktop?: { isDesktop?: boolean } }).turfbdDesktop?.isDesktop ||
      (window as unknown as { process?: { type?: string } }).process?.type === 'renderer' ||
      navigator.userAgent.toLowerCase().includes('electron')
    );
    setIsElectron(electronDetected);

    // Detect Native Mobile Application contexts (WebView / Capacitor / Cordova)
    const nativeAppDetected = Boolean(
      (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView ||
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() ||
      (window as unknown as { cordova?: unknown }).cordova ||
      (window as unknown as { isNativeApp?: boolean }).isNativeApp
    );
    setIsNativeApp(nativeAppDetected);

    // Responsive Desktop Viewport Breakpoint (>= 1024px, matching Tailwind lg)
    const mql = window.matchMedia('(min-width: 1024px)');
    setIsDesktopViewport(mql.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktopViewport(e.matches);
    };

    if (mql.addEventListener) {
      mql.addEventListener('change', handleMediaChange);
    } else {
      // Fallback for older browsers
      mql.addListener(handleMediaChange);
    }

    // Detect platform family
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isDesktopDevice = !isIOSDevice && !isAndroidDevice;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(isDesktopDevice);

    // Sync any pre-captured prompt from index.html
    if (window.deferredPWAInstallPrompt) {
      setDeferredPrompt(window.deferredPWAInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = ((e as CustomEvent).detail || e) as BeforeInstallPromptEvent;
      window.deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.deferredPWAInstallPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('turfbd:beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('turfbd:appinstalled', handleAppInstalled as EventListener);

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('TurfBD Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration skipped:', err);
        });
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleMediaChange);
      } else {
        mql.removeListener(handleMediaChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('turfbd:beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('turfbd:appinstalled', handleAppInstalled as EventListener);
    };
  }, []);

  const install = useCallback(async (): Promise<{ outcome: 'accepted' | 'dismissed' | 'manual' }> => {
    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPWAInstallPrompt : null);
    if (!activePrompt) {
      return { outcome: 'manual' };
    }
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.deferredPWAInstallPrompt = null;
        }
        return { outcome: 'accepted' };
      }
      return { outcome: 'dismissed' };
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      return { outcome: 'manual' };
    }
  }, [deferredPrompt]);

  const platform: 'ios' | 'android' | 'desktop' = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  // Allow PWA install CTA on mobile website or desktop website when:
  // 1. Not already running in standalone PWA / installed mode
  // 2. Not inside the Windows Electron Desktop application
  // 3. Not inside a native application wrapper
  const canShowInstallPrompt =
    !isInstalled &&
    !isElectron &&
    !isNativeApp;

  const isInstallable = Boolean(deferredPrompt || (typeof window !== 'undefined' && window.deferredPWAInstallPrompt));

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isElectron,
    isNativeApp,
    isDesktopViewport,
    canShowInstallPrompt,
    platform,
    install,
  };
}
