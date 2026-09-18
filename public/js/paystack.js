const Paystack = (() => {
  const pay = ({ email, amount, key, onSuccess, onCancel }) => {
    if (!window.PaystackPop) {
      return onCancel?.(new Error('Paystack not loaded'));
    }
    const handler = window.PaystackPop.setup({
      key: key || window.PAYSTACK_PUBLIC_KEY || '',
      email,
      amount: Math.round(amount * 100),
      currency: 'KES',
      callback: (response) => onSuccess?.(response),
      onClose: () => onCancel?.(new Error('Payment window closed')),
    });
    handler.openIframe();
  };

  return { pay };
})();
