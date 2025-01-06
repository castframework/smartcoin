import { SmartCoin } from '../../../dist/types';
import { expect } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySmartCoinFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { anyNonEmptyString, getEventArgsInReceipt } from '../utils/events';
import { RANDOM_TRANSFER_HASH } from '../utils/contants';

const amountToMint = 100;

context('Transfer to Owner', async () => {
  let smartCoin: SmartCoin;
  const signers = await getOperatorSigners();

  const registrarAddress = await signers.registrar.getAddress();
  const operationsAddress = await signers.operations.getAddress();
  const investor1Address = await signers.investor1.getAddress();
  const investor2Address = await signers.investor2.getAddress();

  beforeEach(async () => {
    smartCoin = await loadFixture(deploySmartCoinFixture);

    await smartCoin
      .connect(signers.registrar)
      .mint(investor1Address, amountToMint);
  });

  context('Validate error cases', async () => {
    it('should throw only registrar could validate transfer request', async () => {
      await expect(
        smartCoin
          .connect(signers.investor1)
          .validateTransfer(RANDOM_TRANSFER_HASH),
      ).to.be.revertedWithCustomError(smartCoin, 'UnauthorizedRegistrar');
    });

    it('should throw not found transfer request', async () => {
      await expect(
        smartCoin
          .connect(signers.registrar)
          .validateTransfer(RANDOM_TRANSFER_HASH),
      ).to.be.revertedWithCustomError(smartCoin, 'TransferRequestNotFound');
    });

    it('should throw invalid transfer status', async () => {
      const transferAmount = 3;
      const transferTransaction = await smartCoin
        .connect(signers.investor1)
        .transfer(registrarAddress, transferAmount);
      const transferHash = getEventArgsInReceipt(
        await transferTransaction.wait(),
        'TransferRequested',
      ).transferHash;
      await smartCoin.connect(signers.registrar).validateTransfer(transferHash);
      await expect(
        smartCoin.connect(signers.registrar).validateTransfer(transferHash),
      ).to.be.revertedWithCustomError(
        smartCoin,
        'InvalidTransferRequestStatus',
      );
    });

    it('should fail if sender has been frozen', async () => {
      const transferAmount = 3;
      const transferTransaction = await smartCoin
        .connect(signers.investor1)
        .transfer(registrarAddress, transferAmount);

      const transferHash = getEventArgsInReceipt(
        await transferTransaction.wait(),
        'TransferRequested',
      ).transferHash;

      await smartCoin
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await expect(
        smartCoin.connect(signers.registrar).validateTransfer(transferHash),
      )
        .to.be.revertedWithCustomError(smartCoin, 'Unauthorized')
        .withArgs(investor1Address);
    });

    it('should fail if registrar has been frozen', async () => {
      const transferAmount = 3;
      const transferTransaction = await smartCoin
        .connect(signers.investor1)
        .transfer(registrarAddress, transferAmount);

      const transferHash = getEventArgsInReceipt(
        await transferTransaction.wait(),
        'TransferRequested',
      ).transferHash;

      await smartCoin
        .connect(signers.registrar)
        .freeze([registrarAddress]);

      await expect(
        smartCoin.connect(signers.registrar).validateTransfer(transferHash),
      )
        .to.be.revertedWithCustomError(smartCoin, 'Unauthorized')
        .withArgs(registrarAddress);
    });
  });

  context('Reject error cases', async () => {
    it('should throw only registrar could reject transfer request', async () => {
      await expect(
        smartCoin
          .connect(signers.investor1)
          .rejectTransfer(RANDOM_TRANSFER_HASH),
      ).to.be.revertedWithCustomError(smartCoin, 'UnauthorizedRegistrar');
    });

    it('should throw not found transfer request', async () => {
      await expect(
        smartCoin
          .connect(signers.registrar)
          .rejectTransfer(RANDOM_TRANSFER_HASH),
      ).to.be.revertedWithCustomError(smartCoin, 'TransferRequestNotFound');
    });

    it('should throw invalid transfer status', async () => {
      const transferAmount = 3;
      const transferTransaction = await smartCoin
        .connect(signers.investor1)
        .transfer(registrarAddress, transferAmount);

      const transferHash = getEventArgsInReceipt(
        await transferTransaction.wait(),
        'TransferRequested',
      ).transferHash;

      await smartCoin.connect(signers.registrar).validateTransfer(transferHash);

      const registrarRejectTransferTransaction = smartCoin
        .connect(signers.registrar)
        .rejectTransfer(transferHash);

      await expect(
        registrarRejectTransferTransaction,
      ).to.be.revertedWithCustomError(
        smartCoin,
        'InvalidTransferRequestStatus',
      );
    });
  });

  context('Happy path', async () => {
    const happyPathForAddress = async (destinationAddress: string) => {
      it('should emit a transfer and transferRequested events', async () => {
        const transferAmount = 3;
        const transferTransaction = await smartCoin
          .connect(signers.investor1)
          .transfer(destinationAddress, transferAmount);
        await expect(transferTransaction)
          .to.emit(smartCoin, 'Transfer')
          .withArgs(investor1Address, destinationAddress, 0);
        await expect(transferTransaction)
          .to.emit(smartCoin, 'TransferRequested')
          .withArgs(
            anyNonEmptyString,
            investor1Address,
            destinationAddress,
            transferAmount,
          );
      });

      it('should not update the balance before validation', async () => {
        const transferAmount = 3;
        const destinationBalanceBefore = await smartCoin.callStatic.balanceOf(
          destinationAddress,
        );

        await smartCoin
          .connect(signers.investor1)
          .transfer(destinationAddress, transferAmount);

        const registrarBalanceAfter = await smartCoin.callStatic.balanceOf(
          destinationAddress,
        );

        expect(destinationBalanceBefore).to.be.eql(registrarBalanceAfter);
      });

      it('should update the engaged amount of the investor', async () => {
        const transferAmount = 3;
        const investorBalanceBefore = await smartCoin.callStatic.balanceOf(
          investor1Address,
        );
        const investorEngagedamountBefore =
          await smartCoin.callStatic.engagedAmount(investor1Address);

        await smartCoin
          .connect(signers.investor1)
          .transfer(destinationAddress, transferAmount);

        const investorBalanceAfter = await smartCoin.callStatic.balanceOf(
          investor1Address,
        );
        const investorEngagedamountAfter =
          await smartCoin.callStatic.engagedAmount(investor1Address);

        expect(investorBalanceAfter).to.be.eql(
          investorBalanceBefore.sub(transferAmount),
          'Balance',
        );
        expect(investorEngagedamountAfter).to.be.eql(
          investorEngagedamountBefore.add(transferAmount),
          'Engaged Amount',
        );
      });

      it('should validate transfer request', async () => {
        const transferAmount = 3;

        const destinationBalanceBefore = await smartCoin.callStatic.balanceOf(
          destinationAddress,
        );
        const investorBalanceBefore = await smartCoin.callStatic.balanceOf(
          investor1Address,
        );
        const investorEngagedamountBefore =
          await smartCoin.callStatic.engagedAmount(investor1Address);

        const transferTransaction = await smartCoin
          .connect(signers.investor1)
          .transfer(destinationAddress, transferAmount);

        const transferHash = getEventArgsInReceipt(
          await transferTransaction.wait(),
          'TransferRequested',
        ).transferHash;

        await smartCoin
          .connect(signers.registrar)
          .validateTransfer(transferHash);

        const destinationBalanceAfter = await smartCoin.callStatic.balanceOf(
          destinationAddress,
        );
        const investorBalanceAfter = await smartCoin.callStatic.balanceOf(
          investor1Address,
        );
        const investorEngagedamountAfter =
          await smartCoin.callStatic.engagedAmount(investor1Address);

        expect(destinationBalanceAfter).to.be.eql(
          destinationBalanceBefore.add(transferAmount),
        );
        expect(investorBalanceAfter).to.be.eql(
          investorBalanceBefore.sub(transferAmount),
        );
        expect(investorEngagedamountAfter).to.be.eql(
          investorEngagedamountBefore,
        );
      });

      it('should reject transfer request', async () => {
        const destinationBalanceBefore = await smartCoin.callStatic.balanceOf(
          registrarAddress,
        );
        const investorBalanceBefore = await smartCoin.callStatic.balanceOf(
          investor1Address,
        );
        const investorEngagedamountBefore =
          await smartCoin.callStatic.engagedAmount(investor1Address);

        const transferTransaction = await smartCoin
          .connect(signers.investor1)
          .transfer(registrarAddress, 2);

        const transferHash = getEventArgsInReceipt(
          await transferTransaction.wait(),
          'TransferRequested',
        ).transferHash;

        const rejectTransaction = smartCoin
          .connect(signers.registrar)
          .rejectTransfer(transferHash);

        await expect(rejectTransaction).to.emit(smartCoin, 'TransferRejected');

        const destinationBalanceAfter = await smartCoin.callStatic.balanceOf(
          destinationAddress,
        );
        const investorBalanceAfter = await smartCoin.callStatic.balanceOf(
          investor1Address,
        );
        const investorEngagedamountAfter =
          await smartCoin.callStatic.engagedAmount(investor1Address);

        expect(destinationBalanceAfter).to.be.eql(destinationBalanceBefore);
        expect(investorBalanceAfter).to.be.eql(investorBalanceBefore);
        expect(investorEngagedamountAfter).to.be.eql(
          investorEngagedamountBefore,
        );
      });
    };

    context('Registrar', async () => happyPathForAddress(registrarAddress));
    context('Operations', async () => happyPathForAddress(operationsAddress));
  });

  context('Approve/TransferFrom', async () => {
    it('should forbid to give approve to the registrar', async function () {
      await expect(
        smartCoin.connect(signers.investor1).approve(registrarAddress, 10),
      ).to.be.revertedWithCustomError(smartCoin, `ForbiddenForRegistrar`);
    });

    it('should forbid to send token to the registrar throught a transferFrom', async function () {
      await smartCoin.connect(signers.investor1).approve(investor2Address, 10);

      const transferFromTransaction = smartCoin
        .connect(signers.investor2)
        .transferFrom(investor1Address, registrarAddress, 10);

      await expect(transferFromTransaction).to.be.revertedWithCustomError(
        smartCoin,
        `ForbiddenForRegistrar`,
      );
    });

    it('should forbid to give approve to the operations', async function () {
      await expect(
        smartCoin.connect(signers.investor1).approve(operationsAddress, 10),
      ).to.be.revertedWithCustomError(smartCoin, `ForbiddenForOperations`);
    });

    it('should forbid to send token to the operations throught a transferFrom', async function () {
      await smartCoin.connect(signers.investor1).approve(investor2Address, 10);

      const transferFromTransaction = smartCoin
        .connect(signers.investor2)
        .transferFrom(investor1Address, operationsAddress, 10);

      await expect(transferFromTransaction).to.be.revertedWithCustomError(
        smartCoin,
        `ForbiddenForOperations`,
      );
    });
  });
});
