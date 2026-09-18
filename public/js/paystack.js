const Paystack = (() => {
  const pay = ({ email, amount, onSuccess, onCancel }) => {
    if (!window.PaystackPop) {
      return onCancel?.(new Error('Paystack not loaded'));
    }
    const handler = window.PaystackPop.setup({
      key: window.PAYSTACK_PUBLIC_KEY || '',
      email,
      amount: Math.round(amount * 100),
      currency: 'NGN',
      callback: (response) => onSuccess?.(response),
      onClose: () => onCancel?.(new Error('Payment window closed')),
    });
    handler.openIframe();
  };

  return { pay };
})();