import { ethers, upgrades } from 'hardhat';
import { GetUpgradeToConfig } from './configuration/upgrade-to-config';

async function main() {
  const config = GetUpgradeToConfig();

  const registrarAddress = config.RegistrarAddress;
  const upgradeArtifact = config.ImplementationArtifactName; // Contract source name
  const proxyAddress = config.ProxyAddress;

  const UpgradeContract = await ethers.getContractFactory(
    upgradeArtifact,
    ethers.getSigner(registrarAddress),
  );

  await upgrades.upgradeProxy(proxyAddress, UpgradeContract);

  console.log(`Code upgraded`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
