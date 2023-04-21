import { assertEvent, assertEventArgs } from '../utils/events';
import chai, { assert, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SmartCoinInstance } from '../../../dist/types';
import { AllEvents } from '../../../dist/types/SmartCoin';
import { ethers } from 'ethers';

// registrar actions for the ongoing transfers

const SmartCoint = artifacts.require('SmartCoin');
const amount = 5;

chai.use(chaiAsPromised);
contract('SmartCoin', (accounts) => {
  let smartCoin: SmartCoinInstance;

  const registrar = accounts[1];
  const holder1 = accounts[2];
  const holder2 = accounts[3];

  const amountToMint = 10;
  const fromRegistrar = { from: registrar };
  const fromHolder1 = { from: holder1 };

  context('Transfer adapter', async function () {
    beforeEach(async function () {
      smartCoin = await SmartCoint.new(registrar);
      await smartCoin.addAddressToWhitelist(holder1, { from: registrar });
      await smartCoin.mint(holder1, amountToMint, { from: registrar });
      await smartCoin.addAddressToWhitelist(holder2, { from: registrar });
    });
    // testing ERC20 adpater
    it('should initiate the transfer successfully', async function () {
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.transfer(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'TransferRequested');
      assertEventArgs(rslt, index, 'from', holder1);
      assertEventArgs(rslt, index, 'to', holder2);
      assertEventArgs(rslt, index, 'spender', ethers.constants.AddressZero);
      assertEventArgs(rslt, index, 'value', amount);
    });
    it('should engage an amount after transfer initiation', async function () {
      await smartCoin.transfer(holder2, amount, fromHolder1);
      assert.equal(
        Number(await smartCoin.balanceOf(holder1)),
        amountToMint - amount,
      );
      assert.equal(Number(await smartCoin.engagedAmount(holder1)), amount);
    });
    it('should reject transfer when amount is higher than (balance - engaged amount)', async function () {
      await smartCoin.transfer(holder2, amount, fromHolder1);
      assert.equal(
        Number(await smartCoin.balanceOf(holder1)),
        amountToMint - amount,
      );
      await expect(
        smartCoin.transfer(holder2, amountToMint, fromHolder1),
      ).to.be.rejectedWith('SmartCoin: Insufficient balance');
    });
    it('should reject the transfer and unlock the amount', async function () {
      let rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.transfer(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];

      let engagedAmountAmount = await smartCoin.engagedAmount(holder1);
      assert.equal(Number(engagedAmountAmount), amount);
      rslt = await smartCoin.rejectTransfer(transferHash, fromRegistrar);
      engagedAmountAmount = await smartCoin.engagedAmount(holder1);

      assertEvent(rslt, 'TransferRejected');
      assert.equal(Number(engagedAmountAmount), 0);
    });
    it('should confirm the transfer and send amount to recipient', async function () {
      let rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.transfer(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];

      let engagedAmountAmount = await smartCoin.engagedAmount(holder1);
      assert.equal(Number(engagedAmountAmount), amount);
      rslt = await smartCoin.validateTransfer(transferHash, fromRegistrar);
      engagedAmountAmount = await smartCoin.engagedAmount(holder1);

      assertEvent(rslt, 'TransferValidated');
      assertEvent(rslt, 'Transfer');
      assert.equal(Number(engagedAmountAmount), 0);
      assert.equal(Number(await smartCoin.balanceOf(holder2)), amount);
      assert.equal(
        Number(await smartCoin.balanceOf(holder1)),
        amountToMint - amount,
      );
    });
    it('should fail to validate transfer for unwhitelisted address(from)', async function () {
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.transfer(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];

      await smartCoin.removeAddressFromWhitelist(holder1, fromRegistrar);
      await expect(
        smartCoin.validateTransfer(transferHash, fromRegistrar),
      ).to.be.rejectedWith('Whitelist: address must be whitelisted');
    });
    it('should fail to validate transfer for unwhitelisted address(to)', async function () {
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.transfer(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];
      await smartCoin.removeAddressFromWhitelist(holder2, fromRegistrar);
      await expect(
        smartCoin.validateTransfer(transferHash, fromRegistrar),
      ).to.be.rejectedWith('Whitelist: address must be whitelisted');
    });
    it('should fail when operator is not authorised', async function () {
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.transfer(holder1, amount, fromHolder1);
      const index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];
      await expect(
        smartCoin.validateTransfer(transferHash, {
          from: accounts[5],
        }),
      ).to.be.rejectedWith(
        'Whitelist: Only registrar could perform that action',
      );
    });
  });
});
