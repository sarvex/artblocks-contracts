require("dotenv").config();
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-truffle5";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-solhint";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-etherscan";

const MAINNET_JSON_RPC_PROVIDER_URL = process.env.MAINNET_JSON_RPC_PROVIDER_URL;
const ROPSTEN_JSON_RPC_PROVIDER_URL = process.env.ROPSTEN_JSON_RPC_PROVIDER_URL;
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY;
const TESTNET_PRIVATE_KEY = process.env.TESTNET_PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: {
    version: "0.5.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  networks: {
    hardhat: {
      gasPrice: 0,
      initialBaseFeePerGas: 0,
    },
    mainnet: {
      url: MAINNET_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${MAINNET_PRIVATE_KEY}`],
      gasPrice: 100000000000, // 100 gwei
    },
    ropsten: {
      url: ROPSTEN_JSON_RPC_PROVIDER_URL,
      accounts: [`0x${TESTNET_PRIVATE_KEY}`],
    },
    coverage: {
     url: 'http://localhost:8545',
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  }
};