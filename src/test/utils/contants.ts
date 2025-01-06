import { ethers } from 'ethers';

export const ZERO_ADDRESS = ethers.constants.AddressZero;
export const MAX_UINT = ethers.constants.MaxUint256;
export const TOKEN_NAME = 'EUR CoinVertible';
export const TOKEN_SYMBOL = 'EURCV';
export const RANDOM_TRANSFER_HASH =
  ethers.utils.formatBytes32String('transferHash');
