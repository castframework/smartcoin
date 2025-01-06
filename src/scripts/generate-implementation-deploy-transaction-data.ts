import { ethers } from 'hardhat';
import fs from "fs";
import path from "path";
import { GetNewSmartcoinImplementationConfig } from './configuration/new-smartcoin-implementation-config';

async function main() {
    console.log("Starting...");

    const config = GetNewSmartcoinImplementationConfig();

    const outputFile = path.join(config.OutputFolder, "implementation-deploy-data-field.json");

    const newImplementationDeployData = await generateNewImplementationDeployTransaction( 
        {
            RegistrarAddress: config.NewOperatorsAddress.Registrar,
            OperationAddress: config.NewOperatorsAddress.Operation,
            TechnicalAddress: config.NewOperatorsAddress.Technical
        },
        config.Contracts.ImplementationArtifactName
    );

    console.log(`Generated data field :\n${newImplementationDeployData}`);

    console.log(`Writing to file : ${outputFile}`);

    const fileContentAsPOJO = {
        description: "Data field to be used in a transaction for the deployment of a new implementation contract of smartcoin",
        usedConfig:
        {
            ...config
        },
        data: newImplementationDeployData
    }

    await fs.promises.writeFile(outputFile, JSON.stringify(fileContentAsPOJO, null, "   "));
}

async function generateNewImplementationDeployTransaction(
    newOperatorAddress: {RegistrarAddress: string, OperationAddress: string, TechnicalAddress: string },
    newImplementationContractName: string
): Promise<string> {

    const factorySmartCoin =  await ethers.getContractFactory(newImplementationContractName);

    const transactionData = await factorySmartCoin
    .getDeployTransaction(
        newOperatorAddress.RegistrarAddress,
        newOperatorAddress.OperationAddress,
        newOperatorAddress.TechnicalAddress
    );

    console.log(`Second Trx Data : ${transactionData.data}`);

    return transactionData.data?.toString() || "";
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });