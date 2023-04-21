import { AllEvents, SmartCoinInstance } from '../../../dist/types/SmartCoin';
import { assertEvent, assertEventArgs } from '../utils/events';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

const SmartCoint = artifacts.require('SmartCoin');

chai.use(chaiAsPromised);
contract('SmartCoin', (accounts) => {
  let smartCoin: SmartCoinInstance;

  const registrar = accounts[1];
  const holder1 = accounts[2];
  const holder2 = accounts[3];

  context('Whitelisting & update registrar', async function () {
    beforeEach(async () => {
      smartCoin = await SmartCoint.new(registrar);
    });
    it('should match the initial registrar', async () => {
      const rslt: string = await smartCoin.registrar();
      assert(rslt, registrar);
    });
    it('should update the registrar', async () => {
      const newRegistrar = accounts[4];
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.updateRegistrar(newRegistrar, {
          from: registrar,
        });
      const index = assertEvent(rslt, 'RegistrarUpdated');
      assertEventArgs(rslt, index, 'previousRegistrar', registrar);
      assertEventArgs(rslt, index, 'newRegistrar', newRegistrar);
    });
    it('should whitelist an address', async () => {
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.addAddressToWhitelist(holder1, {
          from: registrar,
        });
      const index = assertEvent(rslt, 'WhitelistedAddressAdded');
      assertEventArgs(rslt, index, 'addr', holder1);
    });
    it('should unwhitelist an address', async () => {
      await smartCoin.addAddressToWhitelist(holder2, { from: registrar });
      const rslt: Truffle.TransactionResponse<AllEvents> =
        await smartCoin.removeAddressFromWhitelist(holder2, {
          from: registrar,
        });
      const index = assertEvent(rslt, 'WhitelistedAddressRemoved');
      assertEventArgs(rslt, index, 'addr', holder2);
    });
    it('should reject whitelist an already whitelisted address', async () => {
      await smartCoin.addAddressToWhitelist(holder2, { from: registrar });
      await expect(
        smartCoin.addAddressToWhitelist(holder2, { from: registrar }),
      ).to.be.rejectedWith('Whitelist: Address already whitelisted');
    });
    it('should reject unwhitelist an already unwhitelisted address', async () => {
      await smartCoin.addAddressToWhitelist(holder2, { from: registrar });
      await smartCoin.removeAddressFromWhitelist(holder2, {
        from: registrar,
      });
      await expect(
        smartCoin.removeAddressFromWhitelist(holder2, {
          from: registrar,
        }),
      ).to.be.rejectedWith('Whitelist: Address not whitelisted');
    });
    it('should reject add whitelist address if not registrar', async () => {
      await expect(
        smartCoin.addAddressToWhitelist(accounts[3], { from: accounts[5] }),
      ).to.be.rejectedWith(
        'Whitelist: Only registrar could perform that action',
      );
    });
  });
});
