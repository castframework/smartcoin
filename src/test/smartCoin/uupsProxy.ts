import { SmartCoin } from '../../../dist/types';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySmartCoinFixture,
  deploySmartCoinV3Fixture,
  getSmartCoinOperatorsAddresses,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { ethers } from 'hardhat';
import { Signer } from 'ethers';
import { EncodedVersionFunction } from '../utils/encodeCall';
import { TOKEN_NAME, TOKEN_SYMBOL, ZERO_ADDRESS } from '../utils/contants';

context('SmartCoin: Proxy', () => {
  let smartcoinProxy: SmartCoin;
  let signers: {
    registrar: Signer;
    investor1: Signer;
    operations: Signer;
    technical: Signer;
  };

  let registrarAddress: string;
  let operationsAddress: string;
  let technicalAddress: string;

  context('Proxy Implementation upgrade', async function () {
    beforeEach(async () => {
      smartcoinProxy = await loadFixture(deploySmartCoinFixture);

      signers = await getOperatorSigners();

      registrarAddress = await signers.registrar.getAddress();
      operationsAddress = await signers.operations.getAddress();
      technicalAddress = await signers.technical.getAddress();
    });

    it('should not be able to call initialize after initialization', async () => {
      const transaction = smartcoinProxy.initialize(TOKEN_NAME, TOKEN_SYMBOL);
      await expect(transaction).to.be.revertedWith(
        'Initializable: contract is already initialized',
      );
    });
    context('Check operators consistency', () => {
      it('should not deploy with zero address operations', async () => {
        const rslt = smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, ZERO_ADDRESS, technicalAddress);
        expect(rslt).to.be.revertedWithCustomError(
          smartcoinProxy,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy with zero address registrar', async () => {
        const rslt = smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(ZERO_ADDRESS, operationsAddress, technicalAddress);
        expect(rslt).to.be.revertedWithCustomError(
          smartcoinProxy,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy with zero address technical', async () => {
        const rslt = smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(technicalAddress, operationsAddress, ZERO_ADDRESS);
        expect(rslt).to.be.revertedWithCustomError(
          smartcoinProxy,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy when operations and registrar have same address', async () => {
        const rslt = smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            registrarAddress,
            technicalAddress,
          );
        expect(rslt).to.be.revertedWithCustomError(
          smartcoinProxy,
          'InconsistentOperators',
        );
      });
      it('should not deploy when operations and technical have same address', async () => {
        const rslt = smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            technicalAddress,
            technicalAddress,
          );
        expect(rslt).to.be.revertedWithCustomError(
          smartcoinProxy,
          'InconsistentOperators',
        );
      });
      it('should not deploy when registrar and technical have same address', async () => {
        const rslt = smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            technicalAddress,
            operationsAddress,
            technicalAddress,
          );
        expect(rslt).to.be.revertedWithCustomError(
          smartcoinProxy,
          'InconsistentOperators',
        );
      });
    });
    it('should be able to be upgraded by the technical', async () => {
      expect(await smartcoinProxy.version()).to.be.equals('V2');

      await smartcoinProxy
        .connect(signers.registrar)
        .nameNewOperators(
          registrarAddress,
          operationsAddress,
          technicalAddress,
        );
      smartcoinProxy.connect(signers.registrar).acceptRegistrarRole();
      smartcoinProxy.connect(signers.operations).acceptOperationsRole();
      smartcoinProxy.connect(signers.technical).acceptTechnicalRole();

      const newSmartCoinV3Address = await loadFixture(deploySmartCoinV3Fixture);

      await smartcoinProxy
        .connect(signers.registrar)
        .authorizeImplementation(newSmartCoinV3Address);
      await smartcoinProxy
        .connect(signers.technical)
        .upgradeTo(newSmartCoinV3Address);

      expect(await smartcoinProxy.version()).to.be.equals('V3');
    });
    context('Check new implementation authorization', async function () {
      let newSmartCoinV3Address: string;
      beforeEach(async () => {
        newSmartCoinV3Address = await loadFixture(deploySmartCoinV3Fixture);
        await smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
        smartcoinProxy.connect(signers.operations).acceptOperationsRole();
        smartcoinProxy.connect(signers.registrar).acceptRegistrarRole();
        smartcoinProxy.connect(signers.technical).acceptTechnicalRole();
      });
      it('should emit an event implementation authorized', async function () {
        const authorizedImplemTransaction = await smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizedImplemTransaction)
          .to.emit(smartcoinProxy, 'ImplementationAuthorized')
          .withArgs(newSmartCoinV3Address);
      });
      it('should fail upgradeTo smartcoin with unauthorized new Implementation', async function () {
        const upgradeSmartContract = smartcoinProxy
          .connect(signers.technical)
          .upgradeTo(newSmartCoinV3Address);
        await expect(upgradeSmartContract)
          .to.be.revertedWithCustomError(
            smartcoinProxy,
            `UnauthorizedImplementation`,
          )
          .withArgs(newSmartCoinV3Address);
      });
      it('should fail upgradeToAndCall smartcoin with unauthorized new Implementation', async function () {
        const upgradeSmartContract = smartcoinProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSmartCoinV3Address, EncodedVersionFunction);
        await expect(upgradeSmartContract)
          .to.be.revertedWithCustomError(
            smartcoinProxy,
            `UnauthorizedImplementation`,
          )
          .withArgs(newSmartCoinV3Address);
      });
      it('should  upgradeTo smartcoin with authorized new Implementation', async function () {
        await smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await smartcoinProxy
          .connect(signers.technical)
          .upgradeTo(newSmartCoinV3Address);
        expect(await smartcoinProxy.version()).to.be.equals('V3');
      });
      it('should fail the second upgradeTo for the same implementation', async function () {
        await smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await smartcoinProxy
          .connect(signers.technical)
          .upgradeTo(newSmartCoinV3Address);

        const upgradeSmartContract = smartcoinProxy
          .connect(signers.technical)
          .upgradeTo(newSmartCoinV3Address);
        await expect(upgradeSmartContract)
          .to.be.revertedWithCustomError(
            smartcoinProxy,
            `UnauthorizedImplementation`,
          )
          .withArgs(newSmartCoinV3Address);
      });
      it('should  upgradeToAndCall smartcoin with authorized new Implementation', async function () {
        await smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await smartcoinProxy
          .connect(signers.technical)
          .upgradeToAndCall(newSmartCoinV3Address, EncodedVersionFunction);
        expect(await smartcoinProxy.version()).to.be.equals('V3');
      });
    });
    context('Check new smartcoin operators role acceptence', async function () {
      let newSmartCoinV3Address: string;
      beforeEach(async () => {
        newSmartCoinV3Address = await loadFixture(deploySmartCoinV3Fixture);
        await smartcoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
      });
      it('should fail with registrar did not accept his role', async function () {
        await smartcoinProxy.connect(signers.operations).acceptOperationsRole();
        await smartcoinProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartcoinProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should fail with technical did not accept his role', async function () {
        await smartcoinProxy.connect(signers.operations).acceptOperationsRole();
        await smartcoinProxy.connect(signers.registrar).acceptRegistrarRole();
        const authorizeImplementation = smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartcoinProxy,
          `UnauthorizedTechnical`,
        );
      });
      it('should fail with operations did not accept his role', async function () {
        await smartcoinProxy.connect(signers.technical).acceptTechnicalRole();
        await smartcoinProxy.connect(signers.registrar).acceptRegistrarRole();
        const authorizeImplementation = smartcoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartcoinProxy,
          `UnauthorizedOperations`,
        );
      });
    });

    it('should be able to be upgraded only by the technical', async () => {
      await smartcoinProxy
        .connect(signers.registrar)
        .nameNewOperators(
          registrarAddress,
          operationsAddress,
          technicalAddress,
        );

      await smartcoinProxy.connect(signers.registrar).acceptRegistrarRole();
      await smartcoinProxy.connect(signers.operations).acceptOperationsRole();
      await smartcoinProxy.connect(signers.technical).acceptTechnicalRole();

      const newSmartCoinAddress = await loadFixture(deploySmartCoinV3Fixture);

      await smartcoinProxy
        .connect(signers.registrar)
        .authorizeImplementation(newSmartCoinAddress);
      const upgradeSmartContract = smartcoinProxy
        .connect(signers.investor1)
        .upgradeTo(newSmartCoinAddress);

      await expect(upgradeSmartContract).to.be.revertedWithCustomError(
        smartcoinProxy,
        `UnauthorizedTechnical`,
      );
    });
    context(
      'upgradeTo and UpdateToAndCall must be called only through delegatecall',
      async () => {
        let smartCoin: SmartCoin;
        let newSmartCoinAddress: string;
        beforeEach(async () => {
          const smartCoinsOperators = await getSmartCoinOperatorsAddresses();
          const SmartCoinFactory = await ethers.getContractFactory('SmartCoin');
          smartCoin = (await SmartCoinFactory.deploy(
            ...smartCoinsOperators,
          )) as SmartCoin;
          smartCoin.deployed();

          newSmartCoinAddress = await loadFixture(deploySmartCoinV3Fixture);
        });
        it('should be able to call upgraded upgradeTo only via delegatecall', async () => {
          const upgrateTo = smartCoin
            .connect(signers.technical)
            .upgradeTo(newSmartCoinAddress);
          await expect(upgrateTo).to.be.rejectedWith(
            'Function must be called through delegatecall',
          );
        });
        it('should be able to call upgraded upgradeToAndCall only via delegatecall', async () => {
          const upgrateTo = smartCoin
            .connect(signers.technical)
            .upgradeToAndCall(newSmartCoinAddress, []);
          await expect(upgrateTo).to.be.rejectedWith(
            'Function must be called through delegatecall',
          );
        });
      },
    );
  });
});
