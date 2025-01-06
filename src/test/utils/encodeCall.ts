import { ethers } from 'hardhat';

const ABI = ['function version()'];
const iface = new ethers.utils.Interface(ABI);

export const EncodedVersionFunction = iface.encodeFunctionData('version', []);
