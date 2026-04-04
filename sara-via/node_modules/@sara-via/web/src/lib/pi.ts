let initialized = false;

export function initPiSdk(): void {
  if (typeof window === 'undefined' || !window.Pi || initialized) {
    return;
  }

  window.Pi.init({
    version: '2.0',
    sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === 'true'
  });

  initialized = true;
}
