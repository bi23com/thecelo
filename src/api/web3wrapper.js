const newKitFromWeb3 = require("@celo/contractkit").newKitFromWeb3;
const Web3 = require("web3");

const wrapper = class {
  _web3;
  _web3http;
  _web3ws;
  _kit;
  _rpcPath;
  _wsPath;

  web3() {
    if (!this._web3) {
      console.log("WEB3");
      this._web3 = new Web3(this.wsUrl());
    }
    return this._web3;
  }

  web3http() {
    if (!this._web3http) {
      console.log("WEB3HTTP/RPC");
      this._web3http = new Web3(
        new Web3.providers.HttpProvider(this.rpcUrl()
        )
      );
    }
    return this._web3http;
  }

  web3ws() {
    if (!this._web3ws) {
      console.log("WEB3WS");
      this._web3ws = new Web3(
        new Web3.providers.WebsocketProvider(this.wsUrl()
        )
      );
    }
    return this._web3ws;
  }

  kit() {
    if (!this._kit) {
      this._kit = newKitFromWeb3(this._web3);
    }
    return this._kit;
  }

  rpcUrl() {
    return "https://" + this._nodeUrl + this._rpcPath;
  }

  wsUrl() {
    return "wss://" + this._nodeUrl + this._wsPath;
  }

  constructor() {
    this._nodeUrl = process.env.QT_URL || "rc1-forno.celo-testnet.org";
    this._rpcPath = process.env.QR_PATH_RPC || "/rpc";
    this._wsPath = process.env.QT_PATH_WS || "/ws";
  }
};

const obj = new wrapper();

export default obj;
