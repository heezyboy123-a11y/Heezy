import { getPaystackConfig } from './storage';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // in smallest unit (kobo or cents)
        currency?: string;
        ref?: string;
        channels?: string[];
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string; status: string; trans?: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackCheckoutOptions {
  email: string;
  amount: number; // full amount (e.g. 10.50 or 5000)
  currency: 'USD' | 'NGN' | 'GBP' | 'EUR';
  orderId: string;
  customerName: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function generatePaystackReference(): string {
  return `OS_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function ensurePaystackScriptLoaded(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="js.paystack.co/v1/inline.js"]'
    );
    const script = existing || document.createElement('script');
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const timer = setTimeout(() => {
      finish(Boolean(window.PaystackPop && typeof window.PaystackPop.setup === 'function'));
    }, timeoutMs);

    script.addEventListener('load', () => {
      clearTimeout(timer);
      finish(Boolean(window.PaystackPop && typeof window.PaystackPop.setup === 'function'));
    });

    script.addEventListener('error', () => {
      clearTimeout(timer);
      finish(false);
    });

    if (!existing) {
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Initiates an official Paystack inline checkout transaction.
 * Paystack sends automatic email payment receipts to the customer's email
 * and settles funds directly to the merchant's linked bank account.
 */
export async function initiatePaystackPayment(options: PaystackCheckoutOptions): Promise<void> {
  const config = getPaystackConfig();
  const reference = generatePaystackReference();
  const isLiveKey = Boolean(
    config.isLive && config.publicKey && config.publicKey.startsWith('pk_live_')
  );

  // In Paystack, amount is sent in lowest denomination (kobo for NGN, cents for USD)
  const amountInSmallestUnit = Math.round(options.amount * 100);

  const loaded = await ensurePaystackScriptLoaded(5000);

  if (loaded && window.PaystackPop && typeof window.PaystackPop.setup === 'function') {
    try {
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: options.email,
        amount: amountInSmallestUnit,
        currency: options.currency === 'NGN' ? 'NGN' : 'USD',
        ref: reference,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        metadata: {
          business_name: config.businessName || 'Open Shelf Books',
          custom_fields: [
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: options.customerName,
            },
            {
              display_name: 'Order ID',
              variable_name: 'order_id',
              value: options.orderId,
            },
            ...(options.metadata
              ? Object.entries(options.metadata).map(([k, v]) => ({
                  display_name: k,
                  variable_name: k,
                  value: String(v),
                }))
              : []),
          ],
        },
        callback: (response) => {
          options.onSuccess(response.reference || reference);
        },
        onClose: () => {
          options.onCancel();
        },
      });

      handler.openIframe();
      return;
    } catch (err) {
      console.warn('Paystack inline popup error:', err);
      if (isLiveKey) {
        options.onError(
          'Could not open Paystack checkout popup. Please disable popup/ad blockers or check your Paystack Public Key.'
        );
        return;
      }
    }
  }

  if (isLiveKey) {
    options.onError(
      'Unable to reach Paystack checkout right now. Please check your internet connection and verify your Paystack Live Public Key.'
    );
    return;
  }

  // In Sandbox/Test preview mode only, allow completing test flow if inline script is blocked by preview iframe
  options.onSuccess(reference);
}
