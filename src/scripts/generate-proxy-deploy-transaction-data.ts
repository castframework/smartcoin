import { ethers } from 'hardhat';
import fs from "fs";
import path from "path";
import ERC1967Proxy from '@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json';
import { GetNewSmartcoinProxyConfig } from './configuration/new-smartcoin-proxy-config';

async function main() {
    console.log("Starting...");

    let config = GetNewSmartcoinProxyConfig();

    const outputFile = path.join(config.OutputFolder, "proxy-deploy-data-field.json");

    const implInitializerCall = await buildInitializerCall(config.Contracts.ImplementationArtifactName, config.Contracts.FullName, config.Contracts.Symbol);

    console.log(`Encoded initializer call : ${implInitializerCall}`);
    
    const newProxyDeployData = await generateNewImplementationDeployTransaction(config.Contracts.ImplementationAddress, implInitializerCall);

    console.log(`Generated proxy deploy data field :\n${newProxyDeployData}`);

    console.log(`Writing to file : ${outputFile}`);

    const fileContentAsPOJO = {
        description: "Data field to be used in a transaction for the deployment of a new smartcoin Proxy",
        usedConfig:
        {
            ...config
        },
        data: newProxyDeployData
    }

    await fs.promises.writeFile(outputFile, JSON.stringify(fileContentAsPOJO, null, "   "));
}

async function generateNewImplementationDeployTransaction(
    newImplementationAddress: string,
    initializerDataCall: string
): Promise<string> {
    const proxyFactory = await ethers.getContractFactory(ERC1967Proxy.abi, ERC1967Proxy.bytecode); // UUPS proxy

    const transactionData = proxyFactory.getDeployTransaction(newImplementationAddress, initializerDataCall);

    return transactionData.data?.toString() || "";
}

async function buildInitializerCall(
    implementationArtifactName: string,
    fullName: string,
    symbol: string
): Promise<string>{
    const factorySmartCoin =  await ethers.getContractFactory(implementationArtifactName);

    const smartCoinInterface = factorySmartCoin.interface;

    const initializeFunction = smartCoinInterface.getFunction('initialize');

    return smartCoinInterface.encodeFunctionData(initializeFunction, [fullName, symbol]);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });