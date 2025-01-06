import { SmartCoin } from '../../../dist/types';
import { getOperatorSigners } from '../utils/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySmartCoinFixture } from '../utils/builders';
import { assert, expect } from 'chai';
import { MAX_UINT, ZERO_ADDRESS } from '../utils/contants';
import { Signer } from 'ethers';
import { Sign, sign } from 'crypto';

export async function assertEngagedAmount(
  smartCoin: SmartCoin,
  owner: string,
): Promise<void> {
  const engagedAmountAmount = (await smartCoin.engagedAmount(owner)).toNumber();
  assert.equal(
    engagedAmountAmount,
    0,
    'Should not engage an amount in the approve',
  );
}

context('SmartCoin', () => {
  let smartCoin: SmartCoin;
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
  let investor3Address: string;
  let investor4Address: string;

  let operationsAddress: string;

  const mintingAmount = 10;
  const amount = 5;

  context('SmartCoin: Approve', async function () {
    beforeEach(async () => {
      smartCoin = await loadFixture(deploySmartCoinFixture);
      signers = await getOperatorSigners();

      registrarAddress = await signers.registrar.getAddress();
      investor1Address = await signers.investor1.getAddress();
      investor2Address = await signers.investor2.getAddress();
      investor3Address = await signers.investor3.getAddress();
      investor4Address = await signers.investor4.getAddress();
      operationsAddress = await signers.operations.getAddress();


      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);
    });

    it('should emit and approval event', async function () {
      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(approveTransaction)
        .to.emit(smartCoin, 'Approval')
        .withArgs(investor1Address, investor2Address, amount);
    });

    it('should revert approve to zero address', async () => {
      await expect(
        smartCoin.connect(signers.investor1).approve(ZERO_ADDRESS, amount),
      ).to.be.revertedWith('ERC20: approve to the zero address');
    });

    it('should overwrite the amount when called twice(smaller amount)', async function () {
      const newApproveAmount = 3;
      const firstApproveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(firstApproveTransaction).to.emit(smartCoin, 'Approval');

      const secondApproveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, newApproveAmount);

      await expect(secondApproveTransaction).to.emit(smartCoin, 'Approval');

      assert.equal(
        Number(await smartCoin.allowance(investor1Address, investor2Address)),
        newApproveAmount,
      );

      await assertEngagedAmount(smartCoin, investor1Address);
    });

    it('should fail to approve for frozen address(owner)', async function () {
      await smartCoin
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await expect(
        smartCoin.connect(signers.investor1).approve(investor2Address, amount),
      )
        .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
        .withArgs(investor1Address);
    });

    it('should fail to approve for blacklisted address(spender)', async function () {
      const freezeTransaction = await smartCoin
        .connect(signers.registrar)
        .freeze([investor2Address]);
      await expect(freezeTransaction).to.emit(
        smartCoin,
        'AddressesFrozen',
      );
      await expect(
        smartCoin.connect(signers.investor1).approve(investor2Address, amount),
      )
        .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
        .withArgs(investor2Address);
    });

    it('should fail to transferFrom for frozen address(spender)', async function () {
      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(approveTransaction).to.emit(smartCoin, 'Approval');

      await smartCoin
        .connect(signers.registrar)
        .freeze([investor2Address]);

      const transferFromTransaction = smartCoin
        .connect(signers.investor2)
        .transferFrom(investor1Address, investor3Address, amount);

      await expect(transferFromTransaction)
        .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
        .withArgs(investor2Address);
    });

    it('should overwrite the amount when called twice(higher amount)', async function () {
      const newApproveAmount = 7;
      const firstApproveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(firstApproveTransaction).to.emit(smartCoin, 'Approval');

      const secondApproveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, newApproveAmount);

      await expect(secondApproveTransaction).to.emit(smartCoin, 'Approval');

      await assertEngagedAmount(smartCoin, investor1Address);

      assert.equal(
        Number(await smartCoin.allowance(investor1Address, investor2Address)),
        newApproveAmount,
      );
    });

    it('should transfer amount from owner to receiver by the spender', async function () {
      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(approveTransaction).to.emit(smartCoin, 'Approval');

      assert.equal(
        (
          await smartCoin.allowance(investor1Address, investor2Address)
        ).toNumber(),
        amount,
        'Invalid allowed amount',
      );

      await smartCoin
        .connect(signers.investor2)
        .transferFrom(investor1Address, investor3Address, amount);

      assert.equal(
        (await smartCoin.balanceOf(investor3Address)).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      await assertEngagedAmount(smartCoin, investor1Address);
    });

    it('should not update the allowance when the amount is equal to Max (uin256)', async function () {
      const transferAmount = 2;

      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, MAX_UINT);

      await expect(approveTransaction).to.emit(smartCoin, 'Approval');

      const allowanceAfterFirstApprove = (
        await smartCoin.allowance(investor1Address, investor2Address)
      ).toString();

      assert.equal(
        allowanceAfterFirstApprove,
        MAX_UINT.toString(),
        'Invalid allowed amount',
      );

      await smartCoin
        .connect(signers.investor2)
        .transferFrom(investor1Address, investor3Address, transferAmount);

      const allowanceAfterRejectedTransferFrom = (
        await smartCoin.allowance(investor1Address, investor2Address)
      ).toString();

      assert.equal(
        allowanceAfterRejectedTransferFrom,
        MAX_UINT.toString(),
        'Invalid allowed amount',
      );
    });

    it('should reject transferFrom with an amount higher than allowance', async function () {
      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(approveTransaction).to.emit(smartCoin, 'Approval');

      assert.equal(
        (
          await smartCoin.allowance(investor1Address, investor2Address)
        ).toNumber(),
        amount,
        'Invalid allowed amount ',
      );

      await assertEngagedAmount(smartCoin, investor1Address);

      await expect(
        smartCoin
          .connect(signers.investor2)
          .transferFrom(investor1Address, investor3Address, amount + 2),
      ).to.be.revertedWith('ERC20: insufficient allowance');
    });

    context('Freeze check for approval', async () => {
      describe('approve', async () => {
        it('should not approve from a frozen owner ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor4Address]);
          await expect(
            smartCoin
              .connect(signers.investor4)
              .approve(investor1Address, amount),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor4Address);
        });

        it('should not approve to a frozen spender ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor4Address]);
          await expect(
            smartCoin
              .connect(signers.investor1)
              .approve(investor4Address, amount),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor4Address);
        });
      });

      describe('increase allowance', async () => {
        it('should not increase allowance from frozen owner ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor4Address]);
          await expect(
            smartCoin
              .connect(signers.investor4)
              .increaseAllowance(investor1Address, amount),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor4Address);
        });

        it('should not increase allowance to frozen spender ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor4Address]);
          await expect(
            smartCoin
              .connect(signers.investor1)
              .increaseAllowance(investor4Address, amount),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor4Address);
        });

        it('should not increase allowance to the registrar ', async () => {
          await expect(
            smartCoin
              .connect(signers.investor1)
              .increaseAllowance(registrarAddress, amount),
          ).to.be.revertedWithCustomError(smartCoin, `ForbiddenForRegistrar`);
        });

        it('should not increase allowance to the registrar ', async () => {
          await expect(
            smartCoin
              .connect(signers.investor1)
              .increaseAllowance(operationsAddress, amount),
          ).to.be.revertedWithCustomError(smartCoin, `ForbiddenForOperations`);
        });
      });

      describe('decrease allowance', async () => {
        it('should not decrease allowance from frozen owner ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor4Address]);

          await expect(
            smartCoin
              .connect(signers.investor4)
              .decreaseAllowance(investor1Address, amount),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor4Address);
        });

        it('should not decrease allowance to  frozen spender ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor4Address]);
          await expect(
            smartCoin
              .connect(signers.investor1)
              .decreaseAllowance(investor4Address, amount),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor4Address);
        });
      });
    });

    it('should increase the allowance', async function () {
      const increateAllowanceAmount = 10;
      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(approveTransaction).to.emit(smartCoin, 'Approval');

      assert.equal(
        (
          await smartCoin.allowance(investor1Address, investor2Address)
        ).toNumber(),
        amount,
        'Invalid allowed amount ',
      );
      await smartCoin
        .connect(signers.investor1)
        .increaseAllowance(investor2Address, increateAllowanceAmount);
      assert.equal(
        (
          await smartCoin.allowance(investor1Address, investor2Address)
        ).toNumber(),
        amount + increateAllowanceAmount,
        'Invalid allowed amount ',
      );
    });

    it('should descrease the allowance', async function () {
      const decreaseAllowanceAmount = 2;
      const approveTransaction = await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, amount);

      await expect(approveTransaction).to.emit(smartCoin, 'Approval');

      assert.equal(
        (
          await smartCoin.allowance(investor1Address, investor2Address)
        ).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      await smartCoin
        .connect(signers.investor1)
        .decreaseAllowance(investor2Address, decreaseAllowanceAmount);
      assert.equal(
        (
          await smartCoin.allowance(investor1Address, investor2Address)
        ).toNumber(),
        amount - decreaseAllowanceAmount,
        'Invalid allowed amount ',
      );
    });

    it('should fail to tranferFrom when from has insufficient balance due to engaged amount', async () => {
      await smartCoin
        .connect(signers.investor1)
        .approve(investor2Address, mintingAmount);

      await smartCoin
        .connect(signers.investor1)
        .transfer(registrarAddress, Math.floor(mintingAmount / 2));

      const transferFromTransaction = smartCoin
        .connect(signers.investor2)
        .transferFrom(investor1Address, investor3Address, mintingAmount);

      await expect(transferFromTransaction).to.be.revertedWithCustomError(
        smartCoin,
        'InsufficientBalance',
      );
    });
  });
});
