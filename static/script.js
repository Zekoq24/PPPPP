let connectedPublicKey;

async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom wallet not found! Please install it.");
    return;
  }

  try {
    const resp = await window.solana.connect();
    connectedPublicKey = resp.publicKey;
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

    // Show cleanup section
    document.getElementById("cleanup-section").style.display = "block";

  } catch (err) {
    console.error(err);
    alert("Connection failed.");
  }
}

async function scanAccounts() {
  const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
  const accounts = await connection.getTokenAccountsByOwner(connectedPublicKey, {
    programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  });

  let closableAccounts = [];

  for (let acc of accounts.value) {
    try {
      const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
      if (amount === 0) {
        closableAccounts.push(acc.pubkey.toString());
      }
    } catch (e) {
      console.warn("Skipping account due to error:", e);
    }
  }

  const rentRecovered = (closableAccounts.length * 0.00203928).toFixed(5);
  document.getElementById("scan-results").innerHTML = `
    <p><strong>Closable Token Accounts:</strong> ${closableAccounts.length}</p>
    <p><strong>Estimated Rent Recovery:</strong> ${rentRecovered} SOL</p>
  `;

  document.getElementById("confirm-btn").style.display = "inline-block";
  window._closableAccounts = closableAccounts;
}

async function confirmAndBurn() {
  if (!window._closableAccounts || _closableAccounts.length === 0) {
    alert("No accounts to close.");
    return;
  }

  const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
  const provider = window.solana;
  const fromPubkey = provider.publicKey;

  for (let pubkey of _closableAccounts) {
    try {
      const transaction = new solanaWeb3.Transaction().add(
        splToken.Token.createCloseAccountInstruction(
          solanaWeb3.TOKEN_PROGRAM_ID,
          new solanaWeb3.PublicKey(pubkey),
          fromPubkey,
          fromPubkey,
          []
        )
      );

      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

    } catch (e) {
      console.error("Failed to close account", pubkey, e);
    }
  }

  alert("Cleanup completed and rent recovered!");
  document.getElementById("confirm-btn").style.display = "none";
  document.getElementById("scan-results").innerHTML = "";
}
