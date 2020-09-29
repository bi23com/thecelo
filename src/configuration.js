class configuration {
  params;
  constructor(params) {
    this.params = params;
  }

  rpcUrl() {
    return this.url(this.params.qt.base, this.params.qt.rpc);
  }

  wsUrl() {
    return this.url(this.params.qt.base, this.params.qt.ws);
  }

  url(url, parts) {
    const { protocol, path, port } = parts;
    return protocol + "://" + url + port + path;
  }
}

export default new configuration({
  qt: {
    base: process.env.QT_URL || "rc1-forno.celo-testnet.org",
    rpc: {
      protocol: process.env.QT_RPC_PROTOCOL || "https",
      path: process.env.QT_RPC_PATH || "/rpc",
      port: process.env.QT_RPC_PORT || ":443",
    },
    ws: {
      protocol: process.env.QT_WS_PROTOCOL || "wss",
      path: process.env.QT_WS_PATH || "/ws",
      port: process.env.QT_WS_PORT || ":443",
    },
  },
  redis: {
    url: process.env.REDIS_URL || "localhost",
    port: process.env.REDIS_PORT || 6379,
  },
});
