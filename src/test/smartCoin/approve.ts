import { assertEvent, assertEventArgs } from '../utils/events';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SmartCoinInstance } from '../../../dist/types';
import { AllEvents } from '../../../dist/types/SmartCoin';
import { ethers } from 'ethers';
const SmartCoin = artifacts.require('SmartCoin');
const EMPTY_VALUE = 0;
export async function assertEngagedAmount(
  smartCoin: SmartCoinInstance,
  owner: string,
): Promise<void> {
  const engagedAmountAmount = (await smartCoin.engagedAmount(owner)).toNumber();
  assert.equal(
    engagedAmountAmount,
    0,
    'Should not engage an amount in the approve',
  );
}
chai.use(chaiAsPromised);
contract('SmartCoin', (accounts) => {
  let smartCoin: SmartCoinInstance;

  const registrar = accounts[1];
  const holder1 = accounts[2];
  const holder2 = accounts[3];
  const holder3 = accounts[4];
  const unwhitelistedAccount = accounts[7];

  const amountToMint = 10;
  const amount = 5;
  const fromRegistrar = { from: registrar };
  const fromHolder1 = { from: holder1 };
  const fromHolder2 = { from: holder2 };
  context('Approve adapter', async function () {
    beforeEach(async () => {
      smartCoin = await SmartCoin.new(registrar);
      await smartCoin.addAddressToWhitelist(holder1, fromRegistrar);
      await smartCoin.addAddressToWhitelist(holder2, fromRegistrar);
      await smartCoin.addAddressToWhitelist(holder3, fromRegistrar);

      await smartCoin.mint(holder1, amountToMint, fromRegistrar);
    });
    it('should create an approve request successfully', async function () {
      const rslt: Truffle.TransactionResponse<any> = await smartCoin.approve(
        holder2,
        amount,
        fromHolder1,
      );
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      expect(approveHash).to.be.not.empty;
      assertEventArgs(rslt, index, 'from', holder1);
      assertEventArgs(rslt, index, 'to', holder2);
      assertEventArgs(rslt, index, 'value', amount);
    });
    it('should not engage the amount after approve creation', async function () {
      await smartCoin.approve(holder2, amount, fromHolder1);
      assert.equal(Number(await smartCoin.balanceOf(holder1)), amountToMint);
      assert.equal(Number(await smartCoin.engagedAmount(holder1)), 0);
    });
    it('should overwrite the amount when called twice(smaller amount)', async function () {
      const newApproveAmount = 3;
      let rslt: Truffle.TransactionResponse<any> = await smartCoin.approve(
        holder2,
        amount,
        fromHolder1,
      );
      let index = assertEvent(rslt, 'ApproveRequested');
      let approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      rslt = await smartCoin.approve(holder2, newApproveAmount, fromHolder1);
      index = assertEvent(rslt, 'ApproveRequested');
      approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      assert.equal(
        Number(await smartCoin.allowance(holder1, holder2)),
        newApproveAmount,
      );
      await assertEngagedAmount(smartCoin, holder1);
    });
    it('should fail to validate approve for unwhitelisted address(from)', async function () {
      const rslt: Truffle.TransactionResponse<any> = await smartCoin.approve(
        holder2,
        amount,
        fromHolder1,
      );
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.removeAddressFromWhitelist(holder1, fromRegistrar);
      await expect(
        smartCoin.validateApprove(approveHash, fromRegistrar),
      ).to.be.rejectedWith('Whitelist: address must be whitelisted');
    });
    it('should fail to validate approve for unwhitelisted address(to)', async function () {
      const rslt: Truffle.TransactionResponse<any> = await smartCoin.approve(
        holder2,
        amount,
        fromHolder1,
      );
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.removeAddressFromWhitelist(holder2, fromRegistrar);
      await expect(
        smartCoin.validateApprove(approveHash, fromRegistrar),
      ).to.be.rejectedWith('Whitelist: address must be whitelisted');
    });
    it('should fail to validate transferFrom for unwhitelisted address(spender)', async function () {
      let rslt = await smartCoin.approve(holder2, amount, fromHolder1);
      let index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);

      rslt = await smartCoin.transferFrom(holder1, holder3, amount, {
        from: holder2,
      });

      index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];

      await smartCoin.removeAddressFromWhitelist(holder2, fromRegistrar);
      await expect(
        smartCoin.validateTransfer(transferHash, fromRegistrar),
      ).to.be.rejectedWith('Whitelist: address must be whitelisted');
    });
    it('should overwrite the amount when called twice(higher amount)', async function () {
      const newApproveAmount = 7;
      let rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.approve(holder2, amount, fromHolder1);
      let index = assertEvent(rslt, 'ApproveRequested');
      let approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);

      rslt = await smartCoin.approve(holder2, newApproveAmount, fromHolder1);
      index = assertEvent(rslt, 'ApproveRequested');
      approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);

      await assertEngagedAmount(smartCoin, holder1);
      assert.equal(
        Number(await smartCoin.allowance(holder1, holder2)),
        newApproveAmount,
      );
    });
    it('should reject the approve and disengage the amount', async function () {
      const rslt: Truffle.TransactionResponse<any> =
        await await smartCoin.approve(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.rejectApprove(approveHash, fromRegistrar);
      assert.equal(
        Number(await smartCoin.engagedAmount(holder1)),
        EMPTY_VALUE,
        'Invalid engagedAmount amount',
      );
      await assertEngagedAmount(smartCoin, holder1);
    });
    it("should confirm approve and allow recipient to spend owner's amount", async function () {
      const rslt: Truffle.TransactionResponse<any> =
        await await smartCoin.approve(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      assert.equal(
        (await smartCoin.allowance(holder1, holder2)).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      await assertEngagedAmount(smartCoin, holder1);
    });
    it('should fail when owner has ongoing approve for same spender', async function () {
      await smartCoin.approve(holder2, amount, fromHolder1);
      void expect(
        smartCoin.approve(holder2, amount, fromHolder1),
      ).to.be.rejectedWith('SmartCoin: owner has ongoing approve request');
    });
    it('should fail when operator is not a registrar', async function () {
      const rslt = await smartCoin.approve(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      void expect(
        smartCoin.validateApprove(approveHash, {
          from: accounts[5],
        }),
      ).to.be.rejectedWith(
        'Whitelist: Only registrar could perform that action',
      );
    });
    it('should transfer amount from owner to receiver by the spender', async function () {
      let rslt = await smartCoin.approve(holder2, amount, fromHolder1);
      let index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      assert.equal(
        (await smartCoin.allowance(holder1, holder2)).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      rslt = await smartCoin.transferFrom(holder1, holder3, amount, {
        from: holder2,
      });

      index = assertEvent(rslt, 'TransferRequested');
      assertEventArgs(rslt, index, 'from', holder1);
      assertEventArgs(rslt, index, 'to', holder3);
      assertEventArgs(rslt, index, 'spender', holder2);
      assertEventArgs(rslt, index, 'value', amount);

      const transferHash = rslt.logs[index].args['transferHash'];
      await smartCoin.validateTransfer(transferHash, fromRegistrar);
      assert.equal(
        (await smartCoin.balanceOf(holder3)).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      await assertEngagedAmount(smartCoin, holder1);
    });
    it('should reject transferFrom to unwhitelisted address', async function () {
      const rslt = await smartCoin.approve(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      assert.equal(
        (await smartCoin.allowance(holder1, holder2)).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      await assertEngagedAmount(smartCoin, holder1);
      await expect(
        smartCoin.transferFrom(holder1, unwhitelistedAccount, amount, {
          from: accounts[4],
        }),
      ).to.be.rejectedWith('Whitelist: address must be whitelisted');
    });
    it('should not update the allowance when the amount is equal to Max (uin256)', async function () {
      const maxAmount = ethers.constants.MaxUint256.toString();
      const transferAmount = 2;
      let rslt = await smartCoin.approve(holder2, maxAmount, fromHolder1);
      let index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      let allowance = (await smartCoin.allowance(holder1, holder2)).toString();
      assert.equal(allowance, maxAmount, 'Invalid allowed amount');

      rslt = await smartCoin.transferFrom(holder1, holder3, transferAmount, {
        from: holder2,
      });
      index = assertEvent(rslt, 'TransferRequested');
      const transferHash = rslt.logs[index].args['transferHash'];
      await smartCoin.rejectTransfer(transferHash, fromRegistrar);
      allowance = (await smartCoin.allowance(holder1, holder2)).toString();
      assert.equal(allowance, maxAmount, 'Invalid allowed amount');
    });
    it('should reject transferFrom with an amount higher than allowance', async function () {
      const rslt = await smartCoin.approve(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);
      assert.equal(
        (await smartCoin.allowance(holder1, holder2)).toNumber(),
        amount,
        'Invalid allowed amount',
      );
      await assertEngagedAmount(smartCoin, holder1);
      await expect(
        smartCoin.transferFrom(holder1, holder3, amount + 2, {
          from: holder2,
        }),
      ).to.be.rejectedWith('ERC20: insufficient allowance');
    });
    it('should have correct allowance upon rejection of transfer', async function () {
      // Approve the initial request for allowance
      const rslt = await smartCoin.approve(holder2, amount, fromHolder1);
      const index = assertEvent(rslt, 'ApproveRequested');
      const approveHash = rslt.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);

      // Check allowance
      const allowance = await smartCoin.allowance(holder1, holder2);
      assert.equal(allowance.toNumber(), amount, 'Invalid allowance amount');

      const result2 = await smartCoin.transferFrom(holder1, holder3, 2, fromHolder2);
      const index2 = assertEvent(result2, 'TransferRequested');
      const transferHash = result2.logs[index2].args['transferHash'];

      await smartCoin.rejectTransfer(transferHash, fromRegistrar);

      // Check allowance
      const newAllowance = await smartCoin.allowance(holder1, holder2);
      assert.equal(newAllowance.toNumber(), amount, 'Failed to rollback allowance amount');
    });
    it('should not cause an overflow in reject transfer', async function () {
      // Approve the initial request for allowance
      const result = await smartCoin.approve(holder2, ethers.constants.MaxUint256.sub(1).toString(), fromHolder1);
      const index = assertEvent(result, 'ApproveRequested');
      const approveHash = result.logs[index].args['approveHash'];
      await smartCoin.validateApprove(approveHash, fromRegistrar);

      const result2 = await smartCoin.transferFrom(holder1, holder3, 2, fromHolder2);
      const index2 = assertEvent(result2, 'TransferRequested');
      const transferHash = result2.logs[index2].args['transferHash'];

      const result3 = await smartCoin.rejectTransfer(transferHash, fromRegistrar);

      assertEvent(result3, 'TransferRejected');
    });
  });
});
