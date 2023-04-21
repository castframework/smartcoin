import { AllEvents, SmartCoinInstance } from '../../../dist/types/SmartCoin';
import { assertEvent, assertEventArgs } from '../utils/events';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

const SmartCoint = artifacts.require('SmartCoin');
const ZER_ADDRESS = '0x0000000000000000000000000000000000000000';
chai.use(chaiAsPromised);

contract('SmartCoin', (accounts) => {
  let smartCoin: SmartCoinInstance;
  const registrar = accounts[1];
  const holder1 = accounts[2];
  const holder2 = accounts[3];
  context('Balance Administration', async function () {
    beforeEach(async () => {
      smartCoin = await SmartCoint.new(registrar);
    });
    it('should match the initial registrar', async () => {
      const rslt = await smartCoin.registrar();
      assert(rslt, registrar);
    });
    it('should mint tokens to whitelisted address', async () => {
      const amountToMint = 10;
      await smartCoin.addAddressToWhitelist(holder1, { from: registrar });
      const rslt: Truffle.TransactionResponse<AllEvents> = await smartCoin.mint(
        holder1,
        amountToMint,
        {
          from: registrar,
        },
      );
      const index = assertEvent(rslt, 'Transfer');
      assertEventArgs(rslt, index, 'from', ZER_ADDRESS);
      assertEventArgs(rslt, index, 'to', holder1);
      assertEventArgs(rslt, index, 'value', amountToMint);
      expect((await smartCoin.balanceOf(holder1)).toString()).to.be.eq(
        amountToMint.toString(),
      );
    });
    it('should fail to mint to unwhitelisted address', async () => {
      const amountToMint = 10;
      void expect(smartCoin.mint(holder1, amountToMint, { from: registrar })).to
        .be.rejected;
    });
    it('should burn tokens from registrar account', async () => {
      const amountToMint = 10;
      await smartCoin.addAddressToWhitelist(registrar, { from: registrar });
      await smartCoin.mint(registrar, amountToMint, { from: registrar });
      const rslt: Truffle.TransactionResponse<AllEvents> = await smartCoin.burn(
        amountToMint,
        { from: registrar },
      );
      const index = assertEvent(rslt, 'Transfer');
      assertEventArgs(rslt, index, 'from', registrar);
      assertEventArgs(rslt, index, 'to', ZER_ADDRESS);
      assertEventArgs(rslt, index, 'value', amountToMint);
      expect((await smartCoin.balanceOf(registrar)).toString()).to.be.eq('0');
    });
    it('should match the total supply', async () => {
      const amountToMint = 1000;
      await smartCoin.addAddressToWhitelist(holder1, { from: registrar });
      await smartCoin.addAddressToWhitelist(holder2, { from: registrar });
      await smartCoin.mint(holder1, amountToMint, { from: registrar });
      await smartCoin.mint(holder2, amountToMint, { from: registrar });
      expect((await smartCoin.totalSupply()).toNumber()).to.be.eq(
        amountToMint * 2,
      );
    });
    it('only registrar could perform a mint', async () => {
      const amountToMint = 1000;
      await smartCoin.addAddressToWhitelist(holder1, { from: registrar });
      await expect(
        smartCoin.mint(holder1, amountToMint, { from: holder2 }),
      ).to.be.rejectedWith(
        'Whitelist: Only registrar could perform that action',
      );
    });
    it('only registrar could perform a recall', async () => {
      const amountToMint = 1000;
      await smartCoin.addAddressToWhitelist(holder1, { from: registrar });
      await smartCoin.mint(holder1, amountToMint, { from: registrar });
      await expect(
        smartCoin.recall(holder1, amountToMint, { from: holder2 }),
      ).to.be.rejectedWith(
        'Whitelist: Only registrar could perform that action',
      );
    });
    it('only registrar could perform a burn', async () => {
      const amountToMint = 1000;
      await smartCoin.addAddressToWhitelist(holder1, { from: registrar });
      await smartCoin.mint(holder1, amountToMint, { from: registrar });
      await expect(
        smartCoin.burn(amountToMint, { from: holder2 }),
      ).to.be.rejectedWith(
        'Whitelist: Only registrar could perform that action',
      );
    });
  });
});
