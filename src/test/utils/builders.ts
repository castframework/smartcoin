import { MissuseAccessControlInternal, SmartCoin } from '../../../dist/types/';
import { ethers, upgrades } from 'hardhat';
import { getOperatorSigners } from './signers';
import { TOKEN_NAME, TOKEN_SYMBOL } from './contants';

export async function getSmartCoinOperatorsAddresses(): Promise<string[]> {
  const signers = await getOperatorSigners();

  const registrarAddress = await signers.registrar.getAddress();
  const operationsAddress = await signers.operations.getAddress();
  const technicalAddress = await signers.technical.getAddress();
  return [registrarAddress, operationsAddress, technicalAddress];
}

export async function deploySmartCoinFixture(): Promise<SmartCoin> {
  const SmartCoin = await ethers.getContractFactory('SmartCoin');

  const smartCoinsOperators: Array<string> =
    await getSmartCoinOperatorsAddresses();
  const smartCoinProxyfiedInstance = (await upgrades.deployProxy(
    SmartCoin,
    [TOKEN_NAME, TOKEN_SYMBOL],
    {
      kind: 'uups',
      constructorArgs: smartCoinsOperators,
      unsafeAllow: ['constructor'],
    },
  )) as SmartCoin;
  return smartCoinProxyfiedInstance;
}

export async function deploySmartCoinV3Fixture(): Promise<string> {
  const signers = await getOperatorSigners();

  const SmartCoinV3Factory = await ethers.getContractFactory(
    'SmartCoinV3',
    signers.technical,
  );

  const smartCoinsOperators: Array<string> =
    await getSmartCoinOperatorsAddresses();
  const smartCoinV2Address = await upgrades.deployImplementation(
    SmartCoinV3Factory,
    {
      constructorArgs: smartCoinsOperators,
      unsafeAllow: ['constructor'],
      kind: 'uups',
    },
  );
  return smartCoinV2Address;
}

export async function deployTestContractMissuseAccessControlInternal(): Promise<MissuseAccessControlInternal> {
  const smartCoinsOperators: Array<string> =
    await getSmartCoinOperatorsAddresses();
  const TestContractBase = await ethers.getContractFactory(
    'MissuseAccessControlInternal',
  );

  const testContract = (await upgrades.deployProxy(TestContractBase, [], {
    kind: 'uups',
    constructorArgs: smartCoinsOperators,
    unsafeAllow: ['constructor'],
  })) as MissuseAccessControlInternal;
  return testContract;
}
