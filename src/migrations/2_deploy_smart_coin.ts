const SmartCoin = artifacts.require("SmartCoin");


module.exports = function (deployer) {

  if (!process.env.REGISTRAR) {
    console.error('Missing registrar address');
    process.exit(1);
  }

  deployer.deploy(SmartCoin, process.env.REGISTRAR);
};
