const SmartCoin = artifacts.require("SmartCoin");

module.exports = function (deployer) {
  deployer.deploy(SmartCoin, "0x42ce53569Ef39e3708E0324709cfafDaf643833f");
};
