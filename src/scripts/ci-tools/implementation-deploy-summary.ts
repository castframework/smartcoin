import { GetNewSmartcoinImplementationConfig, NewSmartcoinImplementationConfig } from "../configuration/new-smartcoin-implementation-config";
import path from 'path';
import process from "process";

const config = GetNewSmartcoinImplementationConfig();

const stepOutput = require(path.join(process.cwd(),config.OutputFolder,"implementation-deploy-data-field.json"));

const usedConfig: NewSmartcoinImplementationConfig = stepOutput.usedConfig;

const summaryTemplate = `
## Implemention deploy transaction data field

### Used Operators 

- Registrar : ${usedConfig.NewOperatorsAddress.Registrar}
- Operation : ${usedConfig.NewOperatorsAddress.Operation}
- Technical : ${usedConfig.NewOperatorsAddress.Technical}

### Generated Data Field

\`\`\`
${stepOutput.data}
\`\`\`
`;

console.log(summaryTemplate);
