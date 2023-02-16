// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import path from "path";
import fs from "fs";
var util = require("util");
import { tryVerify } from "../util/verification";

// hide nuisance logs about event overloading
import { Logger } from "@ethersproject/logger";
Logger.setLogLevel(Logger.levels.ERROR);
import prompt from "prompt";

// delay to avoid issues with reorgs and tx failures
import { delay, getAppPath } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy a generic minter contract to the Ethereum
 * Goerli testnet, for the Art Blocks dev environment.
 * It is intended to document the deployment process and provide a reference
 * for the steps required to deploy any minter contract for any V3 core contract.
 */
async function main() {
  // get repo's root directory absolute path
  const appPath = await getAppPath();
  console.log(appPath);
  console.log(
    `[INFO] example minter deployment config file is:\n\ndeployments/engine/V3/internal-testing/dev-example/minter-deploy-config-01.dev.ts\n`
  );
  prompt.start();
  const deploymentConfigFile = (
    await prompt.get<{ from: string }>(["minter deployment config file"])
  )["minter deployment config file"];
  // dynamically import input deployment configuration details
  const fullDeploymentConfigPath = path.join(appPath, deploymentConfigFile);
  let minterDeployDetailsArray;
  const fullImportPath = path.join(fullDeploymentConfigPath);
  const inputFileDirectory = path.dirname(fullImportPath);
  try {
    ({ minterDeployDetailsArray } = await import(fullImportPath));
  } catch (error) {
    throw new Error(
      `[ERROR] Unable to import minter deployment configuration file at: ${fullDeploymentConfigPath}
      Please ensure the file exists (e.g. deployments/engine/V3/internal-testing/dev-example/minter-deploy-config-01.dev.ts)`
    );
  }
  // record all deployment logs to a file, monkey-patching stdout
  const pathToMyLogFile = path.join(
    inputFileDirectory,
    "MINTER_DEPLOYMENT_LOGS.log"
  );
  var myLogFileStream = fs.createWriteStream(pathToMyLogFile, { flags: "a+" });
  var log_stdout = process.stdout;
  console.log = function (d) {
    myLogFileStream.write(util.format(d) + "\n");
    log_stdout.write(util.format(d) + "\n");
  };
  // record relevant deployment information in logs
  console.log(`----------------------------------------`);
  console.log(
    `[INFO] Datetime of minter deployment: ${new Date().toISOString()}`
  );
  console.log(
    `[INFO] Minter deployment configuration file: ${fullDeploymentConfigPath}`
  );

  const [deployer] = await ethers.getSigners();

  // Perform the following deploy steps for each to-be-deployed minter contract
  for (let index = 0; index < minterDeployDetailsArray.length; index++) {
    const deployDetails = minterDeployDetailsArray[index];

    //////////////////////////////////////////////////////////////////////////////
    // INPUT VALIDATION BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // verify intended network
    const network = await ethers.provider.getNetwork();
    const networkName = network.name == "homestead" ? "mainnet" : network.name;
    if (networkName != deployDetails.network) {
      throw new Error(
        `[ERROR] This script is intended to be run on network ${deployDetails.network} only, but is being run on ${networkName}`
      );
    }
    console.log(`[INFO] Deploying to network: ${networkName}`);

    //////////////////////////////////////////////////////////////////////////////
    // INPUT VALIDATION ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    const minterName = deployDetails.minterName;
    const minterDeployArgs = [];
    // fill in each value for the keys in minterDeployArgs
    for (let j = 0; j < deployDetails.minterDeployArgs.length; j++) {
      minterDeployArgs.push(deployDetails[deployDetails.minterDeployArgs[j]]);
    }
    console.log(
      `[INFO] Deploying ${minterName} with deploy args [${minterDeployArgs}]...`
    );
    const minterFactory = await ethers.getContractFactory(minterName);
    const minter = await minterFactory.deploy(...minterDeployArgs);
    await minter.deployed();
    const minterAddress = minter.address;
    console.log(`[INFO] ${minterName} deployed at ${minterAddress}`);
    await delay(EXTRA_DELAY_BETWEEN_TX);

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENT ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // SETUP BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    // allowlist the new minter on the minter filter
    const minterFilterContract = await ethers.getContractAt(
      "MinterFilterV1",
      deployDetails.minterFilterAddress
    );
    await minterFilterContract.addApprovedMinter(minterAddress);
    console.log(
      `[INFO] allowlisted the new minter on the minter filter at ${deployDetails.minterFilterAddress}`
    );
    await delay(EXTRA_DELAY_BETWEEN_TX);

    // Attempt to verify source code on Etherscan
    await tryVerify(minterName, minterAddress, minterDeployArgs, networkName);
    await delay(EXTRA_DELAY_BETWEEN_TX);

    //////////////////////////////////////////////////////////////////////////////
    // SETUP ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md BEGINS HERE
    //////////////////////////////////////////////////////////////////////////////

    const outputSummaryFile = path.join(inputFileDirectory, "DEPLOYMENTS.md");
    const outputMd = `
# Minter Deployment

Date: ${new Date().toISOString()}

## **Network:** ${networkName}

## **Environment:** ${deployDetails.environment}

**Deployment Input File:** \`${deploymentConfigFile}\`

**${
      deployDetails.minterName
    }:** https://etherscan.io/address/${minterAddress}#code

**Associated core contract:** ${deployDetails.genArt721V3CoreAddress}

**Associated minter filter:** ${deployDetails.minterFilterAddress}

**Deployment Args:** ${minterDeployArgs}

---

`;

    fs.writeFileSync(outputSummaryFile, outputMd, { flag: "as+" });
    console.log(
      `[INFO] Minter deployment details written/appended to ${outputSummaryFile}`
    );

    //////////////////////////////////////////////////////////////////////////////
    // DEPLOYMENTS.md ENDS HERE
    //////////////////////////////////////////////////////////////////////////////

    console.log(
      `[INFO] Completed minter deployment! ${minterName} deployed to ${minterAddress}, and allowlisted on the minter filter at ${deployDetails.minterFilterAddress}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
