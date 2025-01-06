import { SmartCoin } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySmartCoinFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { ZERO_ADDRESS } from '../utils/contants';

const amountToMint = 10;

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

  context('SmartCoin: Transfer', async function () {
    beforeEach(async () => {
      smartCoin = await loadFixture(deploySmartCoinFixture);

      signers = await getOperatorSigners();

      registrarAddress = await signers.registrar.getAddress();
      investor1Address = await signers.investor1.getAddress();
      investor2Address = await signers.investor2.getAddress();

      investor3Address = await signers.investor3.getAddress();

      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, amountToMint);
    });

    it('should revert transfer to zero address', async () => {
      await expect(
        smartCoin
          .connect(signers.investor1)
          .transfer(ZERO_ADDRESS, amountToMint),
      ).to.be.revertedWith('ERC20: transfer to the zero address');
    });

    it('should directly update the balances (non cash out transfer)', async () => {
      const transferAmount = 3;

      const investor1BalanceBefore = await smartCoin.callStatic.balanceOf(
        investor1Address,
      );
      const investor2BalanceBefore = await smartCoin.callStatic.balanceOf(
        investor2Address,
      );

      await smartCoin
        .connect(signers.investor1)
        .transfer(investor2Address, transferAmount);

      const investor1BalanceAfter = await smartCoin.callStatic.balanceOf(
        investor1Address,
      );
      const investor2BalanceAfter = await smartCoin.callStatic.balanceOf(
        investor2Address,
      );

      expect(investor1BalanceAfter).to.be.eql(
        investor1BalanceBefore.sub(transferAmount),
      );
      expect(investor2BalanceAfter).to.be.eql(
        investor2BalanceBefore.add(transferAmount),
      );
    });

    it('should emit a transfer event', async () => {
      const transferAmount = 3;
      const transferTransaction = await smartCoin
        .connect(signers.investor1)
        .transfer(investor2Address, transferAmount);
      await expect(transferTransaction)
        .to.emit(smartCoin, 'Transfer')
        .withArgs(investor1Address, investor2Address, transferAmount);
    });

    it('should fail to tranfer when from has insufficient balance due to engaged amount', async () => {

      await smartCoin
        .connect(signers.investor1)
        .transfer(registrarAddress, Math.floor(amountToMint / 2));

      const transferFromTransaction = smartCoin
        .connect(signers.investor1)
        .transfer(investor2Address, amountToMint);

      await expect(transferFromTransaction).to.be.revertedWithCustomError(
        smartCoin,
        'InsufficientBalance',
      );
    });

    context('Blacklisting check for transfers', async () => {
      describe('transfer', async () => {
        it('should not transfer from frozen owner ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor3Address]);
          await expect(
            smartCoin
              .connect(signers.investor3)
              .transfer(investor1Address, amountToMint),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor3Address);
        });

        it('should not transfer to a frozen address ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor3Address]);
          await expect(
            smartCoin
              .connect(signers.investor1)
              .transfer(investor3Address, amountToMint),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor3Address);
        });
      });
      describe('transfer from', async () => {
        it('should not transfer from frozen owner ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor3Address]);
          await expect(
            smartCoin
              .connect(signers.investor1)
              .transferFrom(investor3Address, investor2Address, amountToMint),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor3Address);
        });

        it('should not authorize transfer to frozen receiver ', async () => {
          await smartCoin.connect(signers.registrar).freeze([investor3Address]);
          await expect(
            smartCoin
              .connect(signers.investor1)
              .transferFrom(investor1Address, investor3Address, amountToMint),
          )
            .to.be.revertedWithCustomError(smartCoin, `Unauthorized`)
            .withArgs(investor3Address);
        });
      });
    });
  });
});
