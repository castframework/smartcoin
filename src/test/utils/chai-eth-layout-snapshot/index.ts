/* eslint-disable @typescript-eslint/no-namespace */
import {
  UpgradeableContract,
  StorageUpgradeErrors,
} from '@openzeppelin/upgrades-core';
import chai from 'chai';
import { Context } from 'mocha';
import snapShot from 'snap-shot-core';
import path from 'path';

/* 
  This could be easily make into a package
*/

declare global {
  namespace Chai {
    interface Assertion {
      compatibleWithSnapshot(that: Context): void;
    }
  }
}

const compareLayout = ({ expected, value }): snapShot.Result => {
  const contractName = 'SmartCoin';

  const oldContract = new UpgradeableContract(
    contractName,
    expected.input,
    expected.output,
  );
  const newContract = new UpgradeableContract(
    contractName,
    value.input,
    value.output,
  );

  const report = oldContract.getStorageUpgradeReport(newContract);

  if (!report.pass) {
    throw new StorageUpgradeErrors(report);
  } else {
    return { orElse: () => true }; // emulate folktale Result.Ok() (don´t want to use transient dependency or adding folktale as one)
  }
};

const getFileName = (mochaContext: Context): string => {
  const runnable = mochaContext.runnable();

  const runnableFile = runnable.file || 'default.ts';

  const basename = path.basename(runnableFile, path.extname(runnableFile));

  return basename;
};

const getTestFullName = (mochaContext: Context): string =>
  mochaContext.runnable().fullTitle();

chai.util.addMethod(
  chai.Assertion.prototype,
  'compatibleWithSnapshot',
  function (context: Context) {
    const layout = chai.util.flag(this, 'object');

    const file = getFileName(context);

    const specName = getTestFullName(context);

    snapShot.core({
      what: layout,
      file,
      specName,
      compare: compareLayout,
    });
  },
);
