import path from 'path';
import process from "process";
import { GetNewSmartcoinProxyConfig,  NewSmartcoinProxyConfig } from "../configuration/new-smartcoin-proxy-config";

const config = GetNewSmartcoinProxyConfig();

const stepOutput = require(path.join(process.cwd(),config.OutputFolder,"proxy-deploy-data-field.json"));

const usedConfig: NewSmartcoinProxyConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Proxy deploy transaction data field

### Used configuration 

- Symbol: ${usedConfig.Contracts.Symbol},
- FullName: ${usedConfig.Contracts.FullName},
- ImplementationAddress: ${usedConfig.Contracts.ImplementationAddress}

### Generated Data Field

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
