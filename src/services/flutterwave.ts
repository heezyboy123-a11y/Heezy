export interface FlutterwaveCheckoutOptions {
  publicKey: string;
  email: string;
  amount: number;
  currency: 'USD' | 'NGN' | 'GBP' | 'EUR';
  orderId: string;
  customerName: string;
  customerPhone?: string;
  businessName?: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: Record<string, unknown>) => void;
  }
}

function ensureFlutterwaveScriptLoaded(timeoutMs = 6000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (typeof window.FlutterwaveCheckout === 'function') {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="checkout.flutterwave.com/v3.js"]'
    );
    const script = existing || document.createElement('script');
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const timer = setTimeout(() => {
      finish(typeof window.FlutterwaveCheckout === 'function');
    }, timeoutMs);

    script.addEventListener('load', () => {
      clearTimeout(timer);
      finish(typeof window.FlutterwaveCheckout === 'function');
    });

    script.addEventListener('error', () => {
      clearTimeout(timer);
      finish(false);
    });

    if (!existing) {
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export async function initiateFlutterwavePayment(
  options: FlutterwaveCheckoutOptions
): Promise<void> {
  const txRef = `FLW_${options.orderId}_${Date.now()}`;
  const loaded = await ensureFlutterwaveScriptLoaded(6000);

  if (!loaded || typeof window.FlutterwaveCheckout !== 'function') {
    options.onError(
      'Unable to load Flutterwave checkout right now. Please check your internet connection or use Bank Transfer.'
    );
    return;
  }

  try {
    let completed = false;
    window.FlutterwaveCheckout({
      public_key: options.publicKey.trim(),
      tx_ref: txRef,
      amount: options.amount,
      currency: options.currency,
      payment_options: 'card, banktransfer, ussd, mobilemoneyghana, account',
      customer: {
        email: options.email,
        phone_number: options.customerPhone || '',
        name: options.customerName,
      },
      customizations: {
        title: options.businessName || 'Open Shelf Books',
        description: `Order #${options.orderId}`,
      },
      callback: (response: Record<string, unknown>) => {
        const status = String(response?.status || '').toLowerCase();
        if (status === 'successful' || status === 'completed') {
          completed = true;
          const ref = String(response?.transaction_id || response?.tx_ref || txRef);
          options.onSuccess(ref);
        } else {
          options.onError('Flutterwave payment was not completed. Please try again.');
        }
      },
      onclose: () => {
        if (!completed) {
          options.onCancel();
        }
      },
    });
  } catch (err) {
    console.warn('Flutterwave checkout error:', err);
    options.onError('Could not launch Flutterwave checkout. Please try Bank Transfer or retry.');
  }
}
