<div align="center">
  <img src="https://www.cast-framework.com/wp-content/themes/forge-framework/img/logo-cast-w.svg" alt="drawing" width="200"/>
</div>

# Description
 
Smartcoin is a token that aims to be used by whitelisted entities.
 
The Registrar is responsible for whitelisting elegible entities.
 
The Registrar is also responsible for mint, burn, recall.
 
A modified version of ERC-20 transfers is used, which requires the approval of the Registrar.

# Pre-requisites

1. Node.js 16.15
2. npm

# Usage

Configure an environment file `.env` using the example seen in `env.sample`
Install the package dependencies via `npm install`
Compile the project via `npm run build`

Deployment is done via truffle by supplying a network to the `deploy` command as follows: `npm run deploy -- --network sepolia`

Unit tests can be run via `npm run test`, and code linting can be performed via `npm run lint`

# Bug Reports

Issues found in the project can be reported by opening an issue on this repository.
Pull Requests should adhere to the provided template.
