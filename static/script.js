async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom wallet not found! Please install it.");
    return;
  }

  try {
    const resp = await window.solana.connect();
    const publicKey = resp.publicKey.toString();
    document.getElementById("info").innerHTML = `<p><strong>Wallet Address:</strong> ${publicKey}</p>`;

    const balanceRes = await fetch(`/balance/${publicKey}`);
    const balanceData = await balanceRes.json();
    const balance = balanceData.balance;

    const priceRes = await fetch(`/price`);
    const priceData = await priceRes.json();
    const price = priceData.solana_price_usd;

    const value = (balance * price).toFixed(2);

    document.getElementById("info").innerHTML += `
      <p><strong>Balance:</strong> ${balance} SOL</p>
      <p><strong>USD Value:</strong> $${value}</p>
    `;
  } catch (err) {
    console.error(err);
    alert("Connection failed.");
  }
}
