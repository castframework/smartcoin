const path = require('path');
const fs = require('fs');

const solcoverConfig = require('./.solcover.js');

const jsonSummaryFilePath = path.join(solcoverConfig.istanbulFolder, 'coverage-summary.json');
const coverage = JSON.parse(fs.readFileSync(jsonSummaryFilePath, 'utf8'));
const globalCoverage = coverage.total;

Object
  .entries(solcoverConfig.limits)
  .forEach(
    ([key, limitValue]) => {
      const coverageForKey = globalCoverage[key];

      if(coverageForKey === undefined){
        console.error(`Unknown key [${key}] valid key are [${Object.keys(globalCoverage)}]`);
        process.exit(2);
      }

      const coveragePercentageForKey = coverageForKey.pct;

      if(coveragePercentageForKey < limitValue){
        console.error(`Target limit for ${key} not reach expected ${limitValue} is ${coveragePercentageForKey}`)
        process.exit(1);
      }
    }
  )

console.log('Coverage limit are in set boundary');