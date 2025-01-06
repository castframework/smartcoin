import { run } from "hardhat";
import * as dotenv from 'dotenv';
dotenv.config();
import { task } from "hardhat/config";
import { GetNewSmartcoinImplementationConfig } from "./configuration/new-smartcoin-implementation-config";

task("verify-implem", "Verify the implementation")
  .addParam("address", "The implementation's address")
  .setAction(async (_args, { ethers, run }) => {

    const config = GetNewSmartcoinImplementationConfig();

    const registrarAddress = config.NewOperatorsAddress.Registrar;
    const operationsAddress = config.NewOperatorsAddress.Operation;
    const technicalAddress = config.NewOperatorsAddress.Technical;
    
    await run(`verify:verify`, {
      address: _args.address,
      contract: "contracts/smartCoin/SmartCoin.sol:SmartCoin",
      constructorArguments: [registrarAddress, operationsAddress, technicalAddress],
    });
    return  _args.address
  });