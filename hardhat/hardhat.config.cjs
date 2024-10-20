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
  },
};
