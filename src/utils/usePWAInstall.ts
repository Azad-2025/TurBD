import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
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

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

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
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<{ outcome: 'accepted' | 'dismissed' | 'manual' }> => {
    if (!deferredPrompt) {
      return { outcome: 'manual' };
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return { outcome: 'accepted' };
      }
      return { outcome: 'dismissed' };
    } catch (err) {
      console.warn('PWA install prompt error:', err);
      return { outcome: 'manual' };
    }
  };

  const platform: 'ios' | 'android' | 'desktop' = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  // Strictly allow PWA install CTA only when:
  // 1. On Desktop website viewport (>= 1024px)
  // 2. Not already running in standalone PWA mode
  // 3. Not inside the Windows Electron Desktop application
  // 4. Not inside a native application wrapper
  // 5. Browser has actually fired beforeinstallprompt and supports direct PWA installation
  const canShowInstallPrompt =
    isDesktopViewport &&
    !isInstalled &&
    !isElectron &&
    !isNativeApp &&
    Boolean(deferredPrompt);

  return {
    isInstallable: !!deferredPrompt,
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
