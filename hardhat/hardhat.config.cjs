// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  networks: {
    story: {
      url: "https://testnet.storyrpc.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 1513,
    },
    hedera: {
      url: "https://testnet.hashio.io/api",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 296,
    },
    polygon: {
      url: "https://rpc-amoy.polygon.technology/",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80002,
    },
    airdao: {
      url: "https://network.ambrosus-test.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 22040,
    },
    zircuit: {
      url: "https://zircuit1-testnet.p2pify.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 48899,
    },
    morph: {
      url: "https://rpc-holesky.morphl2.io",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 2810,
    },
    flow: {
      url: "https://testnet.evm.nodes.onflow.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 545,
    },
    rootstock: {
      url: "https://public-node.testnet.rsk.co",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 31,
    },
    skale: {
      url: "https://testnet.skalenodes.com/v1/giant-half-dual-testnet",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 974399131,
    },
  },
};
