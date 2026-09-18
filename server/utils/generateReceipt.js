const generateReceiptNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const stamp = Date.now().toString().slice(-5);
  return `AV-${y}${m}${d}-${stamp}${rand}`;
};

module.exports = { generateReceiptNumber };