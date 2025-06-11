
// This file can be used to declare global types for objects added to the window, e.g., by external scripts.

// Interface for the Google reCAPTCHA API object (grecaptcha)
interface GRecaptcha {
  reset: (widgetId?: number) => void;
  render: (
    container: string | HTMLElement,
    parameters: {
      sitekey: string;
      theme?: 'dark' | 'light';
      size?: 'compact' | 'normal' | 'invisible';
      callback?: (response: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    }
  ) => number; // Returns the ID of the newly created widget.
  getResponse: (widgetId?: number) => string; // Returns the response token for the given widget ID.
  execute: (widgetId?: number) => Promise<string>; // Programmatically invokes the reCAPTCHA check for invisible reCAPTCHA.
}

// Extend the global Window interface
interface Window {
  grecaptcha?: GRecaptcha; // Google reCAPTCHA API, loaded asynchronously. Optional.
  recaptchaVerifier?: import('firebase/auth').RecaptchaVerifier; // Firebase's RecaptchaVerifier instance. Optional.
  onRecaptchaLoad?: () => void; // Optional callback for when reCAPTCHA script is loaded.
}
