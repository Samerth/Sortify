declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': {
        'pricing-table-id': string;
        'publishable-key': string;
        'customer-email'?: string;
        'client-reference-id'?: string;
        'customer-session-client-secret'?: string;
        onclick?: (event: Event) => void;
        onload?: (event: Event) => void;
      };
    }
  }
  
  interface Window {
    addEventListener(type: 'stripe-pricing-table-ready', listener: (event: Event) => void): void;
    removeEventListener(type: 'stripe-pricing-table-ready', listener: (event: Event) => void): void;
  }
}

export {};