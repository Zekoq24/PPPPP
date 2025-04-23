from flask import Flask, render_template, jsonify
import requests
from datetime import datetime

app = Flask(__name__)

def get_solana_price():
    try:
        response = requests.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        data = response.json()
        return data['solana']['usd']
    except:
        return None

def get_wallet_balance(address):
    try:
        url = "https://api.mainnet-beta.solana.com"
        headers = {"Content-Type": "application/json"}
        data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [address]
        }
        response = requests.post(url, headers=headers, json=data)
        result = response.json()
        return result['result']['value'] / 1_000_000_000  # lamports to SOL
    except:
        return None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/price')
def price():
    sol_price = get_solana_price()
    return jsonify({
        "solana_price_usd": sol_price,
        "timestamp": datetime.now().isoformat(),
        "status": "active"
    })

@app.route('/balance/<address>')
def balance(address):
    balance = get_wallet_balance(address)
    return jsonify({
        "address": address,
        "balance": balance,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
