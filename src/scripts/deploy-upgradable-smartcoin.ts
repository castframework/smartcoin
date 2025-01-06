import { ethers, upgrades } from 'hardhat';
import * as dotenv from 'dotenv';
import { SmartCoin } from '../../dist/types';
import { GetNewSmartcoinImplementationConfig } from './configuration/new-smartcoin-implementation-config';

dotenv.config();

async function main() {
  const implConfig = GetNewSmartcoinImplementationConfig();
  
  const registrarAddress = implConfig.NewOperatorsAddress.Registrar;
  const operationsAddress = implConfig.NewOperatorsAddress.Operation;
  const technicalAddress = implConfig.NewOperatorsAddress.Technical;

  const SmartCoin = await ethers.getContractFactory('SmartCoin');

  const smartCoinProxifiedInstance: SmartCoin = await upgrades.deployProxy(
    SmartCoin,
    ['EUR CoinVertible', 'EURCV'],
    {
      kind: 'uups',
      constructorArgs: [registrarAddress, operationsAddress, technicalAddress],
      unsafeAllow: ['constructor'],
    },
  );

  await smartCoinProxifiedInstance.deployed();
  const smartCoinImplAddress: string =
    await upgrades.erc1967.getImplementationAddress(
      smartCoinProxifiedInstance.address,
    );
  console.log(`SmartCoin implementation address: ${smartCoinImplAddress}`);
  console.log(
    `SmartCoin proxy deployed to ${smartCoinProxifiedInstance.address}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
