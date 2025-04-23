let connectedPublicKey;

async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Please install Phantom Wallet first!");
    return;
  }

  try {
    const response = await window.solana.connect();
    connectedPublicKey = response.publicKey;
    const publicKey = response.publicKey.toString();
    
    document.getElementById("wallet-address").textContent = publicKey;
    document.getElementById("wallet-section").style.display = "block";
    document.getElementById("cleanup-section").style.display = "block";
    
  } catch (error) {
    console.error("Connection error:", error);
    alert("Failed to connect wallet: " + error.message);
  }
}

async function scanAccounts() {
  if (!connectedPublicKey) {
    alert("Please connect your wallet first");
    return;
  }

  try {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
    const accounts = await connection.getTokenAccountsByOwner(connectedPublicKey, {
      programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      encoding: "jsonParsed"
    });

    let closableAccounts = [];
    let totalRent = 0;

    for (let account of accounts.value) {
      try {
        const info = account.account.data.parsed.info;
        if (info.tokenAmount.uiAmount === 0) {
          closableAccounts.push(account.pubkey.toString());
          totalRent += 0.00203928; // Rent exempt amount per account
        }
      } catch (error) {
        console.warn("Error processing account:", error);
      }
    }

    document.getElementById("account-count").textContent = closableAccounts.length;
    document.getElementById("rent-amount").textContent = totalRent.toFixed(5);
    document.getElementById("results-section").style.display = "block";
    
    window.closableAccounts = closableAccounts;

  } catch (error) {
    console.error("Scan error:", error);
    alert("Failed to scan accounts: " + error.message);
  }
}

async function closeAccounts() {
  if (!window.closableAccounts || window.closableAccounts.length === 0) {
    alert("No closable accounts found");
    return;
  }

  try {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
    const wallet = window.solana;
    const publicKey = wallet.publicKey;

    const transaction = new solanaWeb3.Transaction();
    
    for (let account of window.closableAccounts) {
      transaction.add(
        splToken.Token.createCloseAccountInstruction(
          new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          new solanaWeb3.PublicKey(account),
          publicKey,
          publicKey,
          []
        )
      );
    }

    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    document.getElementById("tx-result").innerHTML = `
      <p>Transaction sent! <a href="https://solscan.io/tx/${signature}" target="_blank">View on Solscan</a></p>
    `;
    
    // Refresh account list
    await scanAccounts();

  } catch (error) {
    console.error("Close error:", error);
    alert("Failed to close accounts: " + error.message);
  }
}
