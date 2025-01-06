import fs from 'fs';
import path from 'path';

/**
 * Returns the datalayout of a given contract using the hardhat
 * dbg.json files
 *
 * @param contractSourcePath The relative path of the contract source from the artifacts folder
 * @returns Return the solc storageLayout.storage object
 *
 * @beta
 */
export function getSmartCoinDataLayout(
  contractSourcePath: string,
  buildFolder = './dist',
  contractSourceFolder = 'contracts',
): unknown {
  const dbgFileName = path
    .basename(contractSourcePath)
    .replace(path.extname(contractSourcePath), '.dbg.json');

  const contractDbgPath = path.join(
    buildFolder,
    contractSourceFolder,
    contractSourcePath,
    dbgFileName,
  );

  const contractDbg = JSON.parse(fs.readFileSync(contractDbgPath, 'utf-8'));

  const buildInfoFilePath = path.join(
    contractDbgPath,
    '../',
    contractDbg.buildInfo,
  );
  const buildInfoFile = JSON.parse(fs.readFileSync(buildInfoFilePath, 'utf-8'));

  return buildInfoFile;
}
