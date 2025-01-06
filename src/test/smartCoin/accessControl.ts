import { MissuseAccessControlInternal, SmartCoin } from '../../../dist/types';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  deploySmartCoinFixture,
  deploySmartCoinV3Fixture,
  deployTestContractMissuseAccessControlInternal,
} from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { ZERO_ADDRESS } from '../utils/contants';
import { Signer } from 'ethers';



context('SmartCoin', () => {
  let smartCoinProxy: SmartCoin;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    investor4: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settler: Signer;
    operations: Signer;
    technical: Signer;
  };

  let registrarAddress: string;
  let investor1Address: string;
  let investor2Address: string;
  let operationsAddress: string;
  let technicalAddress: string;

  context('SmartCoin: naming operators', async function () {
    beforeEach(async () => {
      smartCoinProxy = await loadFixture(deploySmartCoinFixture);

      signers = await getOperatorSigners();

      operationsAddress = await signers.operations.getAddress();
      technicalAddress = await signers.technical.getAddress();

      registrarAddress = await signers.registrar.getAddress();
      investor1Address = await signers.investor1.getAddress();
      investor2Address = await signers.investor2.getAddress();
    });
    context('should not accept naming Zero Address operator', async () => {
      it('should not be able to name a zero address registrar', async () => {
        const nameOperators = smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(ZERO_ADDRESS, operationsAddress, technicalAddress);
        await expect(nameOperators).to.be.revertedWithCustomError(
          smartCoinProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should not be able to name a zero address operations', async () => {
        const nameOperators = smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, ZERO_ADDRESS, technicalAddress);
        await expect(nameOperators).to.be.revertedWithCustomError(
          smartCoinProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should not be able to name a zero address technical', async () => {
        const nameOperators = smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(registrarAddress, operationsAddress, ZERO_ADDRESS);
        await expect(nameOperators).to.be.revertedWithCustomError(
          smartCoinProxy,
          `ZeroAddressCheck`,
        );
      });
    });
    context('should accept only authorized role', async () => {
      let nameNewOperatorsTransaction;
      beforeEach(async () => {
        nameNewOperatorsTransaction = await smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
      });
      it('should emit an event NamedNewOperatots', async () => {
        await expect(nameNewOperatorsTransaction)
          .to.emit(smartCoinProxy, 'NamedNewOperators')
          .withArgs(registrarAddress, operationsAddress, technicalAddress);
      });
      it('only registrar could name new operators', async () => {
        const nameNewOperators = smartCoinProxy
          .connect(signers.investor1)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
        await expect(nameNewOperators).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should not be able to accept unauthorized registrar role', async () => {
        const acceptRegistrarRole = smartCoinProxy
          .connect(signers.investor1)
          .acceptRegistrarRole();
        await expect(acceptRegistrarRole).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should not be able to accept unauthorized operations role', async () => {
        const acceptOperationsRole = smartCoinProxy
          .connect(signers.investor1)
          .acceptOperationsRole();
        await expect(acceptOperationsRole).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedOperations`,
        );
      });
      it('should not be able to accept unauthorized technical role', async () => {
        const acceptTechnicalRole = smartCoinProxy
          .connect(signers.investor1)
          .acceptTechnicalRole();
        await expect(acceptTechnicalRole).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedTechnical`,
        );
      });

      it('should be able to accept authorized registrar role', async () => {
        const acceptRegistrarRole = await smartCoinProxy
          .connect(signers.registrar)
          .acceptRegistrarRole();
        await expect(acceptRegistrarRole)
          .to.emit(smartCoinProxy, 'AcceptedRegistrarRole')
          .withArgs(registrarAddress);
      });
      it('should be able to accept authorized operations role', async () => {
        const acceptOperationsRole = await smartCoinProxy
          .connect(signers.operations)
          .acceptOperationsRole();
        await expect(acceptOperationsRole)
          .to.emit(smartCoinProxy, 'AcceptedOperationsRole')
          .withArgs(operationsAddress);
      });
      it('should be able to accept authorized technical role', async () => {
        const acceptTechnicalRole = await smartCoinProxy
          .connect(signers.technical)
          .acceptTechnicalRole();
        await expect(acceptTechnicalRole)
          .to.emit(smartCoinProxy, 'AcceptedTechnicalRole')
          .withArgs(technicalAddress);
      });
    });

    it('should freeze an address', async () => {
      const addAddressTransaction = await smartCoinProxy
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await expect(addAddressTransaction)
        .to.emit(smartCoinProxy, 'AddressesFrozen')
        .withArgs([investor1Address]);
    });
    it('should get not frozen addresses from a list of addresses', async () => {
      await smartCoinProxy
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await expect((await smartCoinProxy.findNotFrozen([investor1Address, investor2Address, registrarAddress]))).to.deep.eq([investor2Address, registrarAddress])
    });

    it('should unfreeze an address', async () => {
      await smartCoinProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      const removeFromAccessControlTransaction = await smartCoinProxy
        .connect(signers.registrar)
        .unfreeze([investor2Address]);

      await expect(removeFromAccessControlTransaction)
        .to.emit(smartCoinProxy, 'AddressesUnFrozen')
        .withArgs([investor2Address]);
    });

    it('should reject blacklist an already frozen address', async () => {
      await smartCoinProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      await expect(
        smartCoinProxy
          .connect(signers.registrar)
          .freeze([investor2Address]),
      ).to.be.revertedWithCustomError(
        smartCoinProxy,
        `AddressAlreadyFrozen`,
      );
    });

    it('should reject unfreeze an already unfrozen address', async () => {
      await smartCoinProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      await smartCoinProxy
        .connect(signers.registrar)
        .unfreeze([investor2Address]);

      await expect(
        smartCoinProxy
          .connect(signers.registrar)
          .unfreeze([investor2Address]),
      )
        .to.be.revertedWithCustomError(smartCoinProxy, `AddressNotFrozen`)
        .withArgs(investor2Address);
    });

    it('only registrar could freeze an address', async () => {
      await expect(
        smartCoinProxy
          .connect(signers.investor3)
          .freeze([investor2Address]),
      ).to.be.revertedWithCustomError(smartCoinProxy, `UnauthorizedRegistrar`);
    });
    it('only registrar could unfreeze an address', async () => {
      await smartCoinProxy
        .connect(signers.registrar)
        .freeze([investor2Address]);

      await expect(
        smartCoinProxy
          .connect(signers.investor3)
          .unfreeze([investor2Address]),
      ).to.be.revertedWithCustomError(smartCoinProxy, `UnauthorizedRegistrar`);
    });
  });
  context(
    'Check whether named operators match the new implementation operators',
    async function () {
      let newSmartCoinV3Address: string;
      beforeEach(async () => {
        newSmartCoinV3Address = await loadFixture(deploySmartCoinV3Fixture);
      });
      it('only registar could authorize new implementation', async function () {
        await smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
        await smartCoinProxy.connect(signers.operations).acceptOperationsRole();
        await smartCoinProxy.connect(signers.registrar).acceptRegistrarRole();
        await smartCoinProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = smartCoinProxy
          .connect(signers.technical)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('only not zero address implementation should be authorized', async function () {
        await smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            technicalAddress,
          );
        await smartCoinProxy.connect(signers.operations).acceptOperationsRole();
        await smartCoinProxy.connect(signers.registrar).acceptRegistrarRole();
        await smartCoinProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = smartCoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(ZERO_ADDRESS);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartCoinProxy,
          `ZeroAddressCheck`,
        );
      });
      it('should fail with registrar did not match implementation registrar', async function () {
        await smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            investor1Address,
            operationsAddress,
            technicalAddress,
          );
        await smartCoinProxy.connect(signers.operations).acceptOperationsRole();
        await smartCoinProxy.connect(signers.investor1).acceptRegistrarRole();
        await smartCoinProxy.connect(signers.technical).acceptTechnicalRole();
        const authorizeImplementation = smartCoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedRegistrar`,
        );
      });
      it('should fail with technical did not match implementation technical', async function () {
        await smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            operationsAddress,
            investor1Address,
          );
        await smartCoinProxy.connect(signers.operations).acceptOperationsRole();
        await smartCoinProxy.connect(signers.registrar).acceptRegistrarRole();
        await smartCoinProxy.connect(signers.investor1).acceptTechnicalRole();

        const authorizeImplementation = smartCoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedTechnical`,
        );
      });
      it('should fail with operations did not match implementation operations', async function () {
        await smartCoinProxy
          .connect(signers.registrar)
          .nameNewOperators(
            registrarAddress,
            investor1Address,
            technicalAddress,
          );
        await smartCoinProxy.connect(signers.technical).acceptTechnicalRole();
        await smartCoinProxy.connect(signers.registrar).acceptRegistrarRole();
        await smartCoinProxy.connect(signers.investor1).acceptOperationsRole();
        const authorizeImplementation = smartCoinProxy
          .connect(signers.registrar)
          .authorizeImplementation(newSmartCoinV3Address);
        await expect(authorizeImplementation).to.be.revertedWithCustomError(
          smartCoinProxy,
          `UnauthorizedOperations`,
        );
      });
    },
  );
  context('AccessControl: internal', async () => {
    let testContract: MissuseAccessControlInternal;

    beforeEach(async () => {
      testContract = await loadFixture(
        deployTestContractMissuseAccessControlInternal,
      );
      signers = await getOperatorSigners();
      registrarAddress = await signers.registrar.getAddress();
    });

    it('should lock init function after init', async () => {
      const doubleInit = testContract.doubleInitAccessControl();
      await expect(doubleInit).to.be.reverted;
    });
  });
});
