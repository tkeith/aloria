// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Aloria", (m) => {
  const aloria = m.contract("Aloria");

  return { aloria };
});
