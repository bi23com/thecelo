const newKitFromWeb3 = require("@celo/contractkit").newKitFromWeb3;
const Web3 = require("web3");
const config = require("./configuration").default;

const wrapper = class {
  _web3;
  _web3http;
  _web3ws;
  _kit;

  web3() {
    if (!this._web3) {
      this._web3 = new Web3(config.wsUrl());
    }
    return this._web3;
  }

  web3http() {
    if (!this._web3http) {
      this._web3http = new Web3(
        new Web3.providers.HttpProvider(config.rpcUrl())
      );
    }
    return this._web3http;
  }

  web3ws() {
    if (!this._web3ws) {
      this._web3ws = new Web3(
        new Web3.providers.WebsocketProvider(config.wsUrl())
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
};

const obj = new wrapper();

export default obj;
