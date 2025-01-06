import { Signer } from 'ethers';
import { ethers } from 'hardhat';

export const signerIndex = {
  issuer: 2,
  registrar: 1,
  settler: 3,
  investor4: 4,
  investor1: 5,
  investor2: 6,
  investor3: 7,
  operations: 8,
  technical: 9,
};

type OperatorSigners = {
  [operator in keyof typeof signerIndex]: Signer;
};

export async function getOperatorSigners(): Promise<OperatorSigners> {
  const signers = await ethers.getSigners();

  const operatorSignerTupleArray = await Promise.all(
    Object.entries(signerIndex).map(async ([operator, index]) => [
      operator,
      await signers[index],
    ]),
  );

  return operatorSignerTupleArray.reduce(
    (acc, [k, v]: [string, string]) => ({ ...acc, [k]: v }),
    {},
  ) as OperatorSigners;
}
