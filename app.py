from flask import Flask, render_template
import requests
from solders.pubkey import Pubkey
from solders.instruction import Instruction
from solders.system_program import TransferParams, transfer
import base58

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
