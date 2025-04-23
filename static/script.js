let connectedPublicKey;
const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

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

    // إظهار قسم التنظيف مباشرة بعد الاتصال
    document.getElementById("cleanup-section").style.display = "block";

  } catch (err) {
    console.error("Connection error:", err);
    alert("Connection failed: " + err.message);
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
      programId: TOKEN_PROGRAM_ID,
      encoding: "jsonParsed"
    });

    let closableAccounts = [];
    let totalRent = 0;

    for (let acc of accounts.value) {
      try {
        const info = acc.account.data.parsed.info;
        const amount = info.tokenAmount.uiAmount;
        const decimals = info.tokenAmount.decimals;
        
        // حساب تكلفة الرينت لكل حساب
        const rentExemptAmount = 0.00203928; // الحد الأدنى للرينت
        
        if (amount === 0) {
          closableAccounts.push({
            pubkey: acc.pubkey.toString(),
            mint: info.mint,
            rent: rentExemptAmount
          });
          totalRent += rentExemptAmount;
        }
      } catch (e) {
        console.warn("Skipping account:", e);
      }
    }

    const rentRecovered = totalRent.toFixed(5);
    document.getElementById("scan-results").innerHTML = `
      <p><strong>Closable Accounts:</strong> ${closableAccounts.length}</p>
      <p><strong>Estimated SOL to Recover:</strong> ${rentRecovered}</p>
      ${closableAccounts.length > 0 ? '<p style="color:red;">Warning: This will permanently close these token accounts</p>' : ''}
    `;

    if (closableAccounts.length > 0) {
      document.getElementById("confirm-btn").style.display = "inline-block";
      window._closableAccounts = closableAccounts;
    } else {
      alert("No closable accounts found");
    }

  } catch (err) {
    console.error("Scan error:", err);
    alert("Scan failed: " + err.message);
  }
}

async function confirmAndBurn() {
  if (!window._closableAccounts || window._closableAccounts.length === 0) {
    alert("No accounts to close");
    return;
  }

  if (!confirm(`Are you sure you want to close ${window._closableAccounts.length} accounts?`)) {
    return;
  }

  try {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("mainnet-beta"));
    const provider = window.solana;
    const wallet = provider.publicKey;

    // إرسال معاملة واحدة لكل الحسابات لخفض التكلفة
    const transaction = new solanaWeb3.Transaction();
    
    for (let acc of window._closableAccounts) {
      transaction.add(
        splToken.Token.createCloseAccountInstruction(
          TOKEN_PROGRAM_ID,
          new solanaWeb3.PublicKey(acc.pubkey),
          wallet,
          wallet,
          []
        )
      );
    }

    // إضافة رسوم للمعاملة
    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet;

    // التوقيع والإرسال
    const signed = await provider.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    
    // الانتظار للتأكيد
    await connection.confirmTransaction(signature, "confirmed");
    
    document.getElementById("scan-results").innerHTML += `
      <p style="color:green;">Success! Transaction: <a href="https://solscan.io/tx/${signature}" target="_blank">${signature.slice(0,10)}...</a></p>
    `;
    
    document.getElementById("confirm-btn").style.display = "none";
    window._closableAccounts = null;

  } catch (err) {
    console.error("Cleanup error:", err);
    alert("Cleanup failed: " + err.message);
  }
}
