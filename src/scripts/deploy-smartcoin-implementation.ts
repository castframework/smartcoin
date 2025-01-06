import { ethers, upgrades } from 'hardhat';
import * as dotenv from 'dotenv';
import { SmartCoin } from '../../dist/types';
import { GetNewSmartcoinImplementationConfig } from './configuration/new-smartcoin-implementation-config';

dotenv.config();

async function main() {
  const config = GetNewSmartcoinImplementationConfig();

  const registrarAddress = config.NewOperatorsAddress.Registrar;
  const operationsAddress = config.NewOperatorsAddress.Operation;
  const technicalAddress = config.NewOperatorsAddress.Technical;

  const SmartCoin = await ethers.getContractFactory('SmartCoin');

  console.log(`Deploying SmartCoin implementation with registrar[${registrarAddress}] operations[${operationsAddress}] technical[${technicalAddress}]`)

  const implementationAddress: SmartCoin = await upgrades.deployImplementation(
    SmartCoin,
    {
      kind: 'uups',
      constructorArgs: [registrarAddress, operationsAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    },
  );

  console.log(`SmartCoin implementation address: ${implementationAddress}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
