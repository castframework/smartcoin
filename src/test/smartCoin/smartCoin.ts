import { SmartCoin } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySmartCoinFixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';
import { TOKEN_NAME, TOKEN_SYMBOL } from '../utils/contants';
import { ethers } from 'hardhat';
import "@nomicfoundation/hardhat-chai-matchers"; //Added for revertWithCustomErrors

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

context('SmartCoin', () => {
  let smartCoin: SmartCoin;
  const mintingAmount = 1000;
  let signers: {
    registrar: Signer;
    issuer: Signer;
    investor4: Signer;
    investor1: Signer;
    investor2: Signer;
    investor3: Signer;
    settler: Signer;
  };

  let registrarAddress: string;
  let investor1Address: string;
  let investor2Address: string;

  context('SmartCoin: Balance Administration', async function () {
    beforeEach(async () => {
      smartCoin = await loadFixture(deploySmartCoinFixture);
      signers = await getOperatorSigners();

      registrarAddress = await signers.registrar.getAddress();
      investor1Address = await signers.investor1.getAddress();
      investor2Address = await signers.investor2.getAddress();
    });
    context('Operators zero address & consistency check ', () => {
      let SmartCoinFactory;
      beforeEach(async () => {
        SmartCoinFactory = await ethers.getContractFactory('SmartCoin');
      });
      it('should not deploy with zero address operations', async () => {
        const newSmartCoin = SmartCoinFactory.deploy(
          registrarAddress,
          ZERO_ADDRESS,
          investor1Address,
        );
        expect(newSmartCoin).to.be.revertedWithCustomError(
          smartCoin,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy with zero address registrar', async () => {
        const newSmartCoin = SmartCoinFactory.deploy(
          ZERO_ADDRESS,
          investor2Address,
          investor1Address,
        );
        expect(newSmartCoin).to.be.revertedWithCustomError(
          smartCoin,
          'ZeroAddressCheck',
        );
      });
      it('should not deploy with zero address technical', async () => {
        const newSmartCoin = SmartCoinFactory.deploy(
          investor1Address,
          investor2Address,
          ZERO_ADDRESS,
        );
        expect(newSmartCoin).to.be.revertedWithCustomError(
          smartCoin,
          'ZeroAddressCheck',
        );

        it('should not deploy when operations and registrar have same address', async () => {
          const newSmartCoin = SmartCoinFactory.deploy(
            investor1Address,
            investor1Address,
            investor2Address,
          );
          expect(newSmartCoin).to.be.revertedWithCustomError(
            smartCoin,
            'InconsistentOperators',
          );
        });
        it('should not deploy when operations and technical have same address', async () => {
          const newSmartCoin = SmartCoinFactory.deploy(
            investor2Address,
            investor1Address,
            investor1Address,
          );
          expect(newSmartCoin).to.be.revertedWithCustomError(
            smartCoin,
            'InconsistentOperators',
          );
        });
        it('should not deploy when registrar and technical have same address', async () => {
          const newSmartCoin = SmartCoinFactory.deploy(
            investor1Address,
            investor2Address,
            investor1Address,
          );
          expect(newSmartCoin).to.be.revertedWithCustomError(
            smartCoin,
            'InconsistentOperators',
          );
        });
      });
    });
    it('should mint tokens to unfrozen address', async () => {

      const mintTransaction = await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await expect(mintTransaction)
        .to.emit(smartCoin, 'Transfer')
        .withArgs(ZERO_ADDRESS, investor1Address, mintingAmount);

      await expect(await smartCoin.balanceOf(investor1Address)).to.be.eq(
        mintingAmount,
      );
    });

    it('should fail to mint to frozen address', async () => {
      await smartCoin.connect(signers.registrar).freeze([investor1Address]);
      await expect(
        smartCoin.connect(signers.registrar).mint(investor1Address, 10),
      ).to.be.reverted;
    });

    it("should match the token's symbol", async () => {
      await expect(await smartCoin.symbol()).to.be.eq(TOKEN_SYMBOL);
    });
    it("should match the token's name", async () => {
      await expect(await smartCoin.name()).to.be.eq(TOKEN_NAME);
    });

    it('should burn tokens from registrar account', async () => {

      await smartCoin
        .connect(signers.registrar)
        .mint(registrarAddress, mintingAmount);

      const burnTransaction = await smartCoin
        .connect(signers.registrar)
        .burn(mintingAmount);

      await expect(burnTransaction)
        .to.emit(smartCoin, 'Transfer')
        .withArgs(registrarAddress, ZERO_ADDRESS, mintingAmount);

      await expect(
        (await smartCoin.balanceOf(registrarAddress)).toString(),
      ).to.be.eq('0');
    });

    it('should match the total supply', async () => {

      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await smartCoin
        .connect(signers.registrar)
        .mint(investor2Address, mintingAmount);

      await expect((await smartCoin.totalSupply()).toNumber()).to.be.eq(
        mintingAmount * 2,
      );
    });

    it('should fail with only registrar could perform a mint', async () => {
      await expect(
        smartCoin.connect(signers.investor2).mint(investor1Address, 1000),
      ).to.be.revertedWithCustomError(smartCoin, `UnauthorizedRegistrar`);
    });

    it('should fail with only registrar could perform a wipeFrozenAddress', async () => {

      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await expect(
        smartCoin
          .connect(signers.investor2)
          .wipeFrozenAddress(investor1Address),
      ).to.be.revertedWithCustomError(smartCoin, `UnauthorizedRegistrar`);
    });
    it('should fail to wipe from not frozen address', async () => {
      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await expect(
        smartCoin
          .connect(signers.registrar)
          .wipeFrozenAddress(investor1Address),
      ).to.be.revertedWithCustomError(smartCoin, `AddressNotFrozen`).withArgs(investor1Address);
    });
    it('should  wipe from  frozen address', async () => {
      
      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await smartCoin.connect(signers.registrar).freeze([investor1Address]);

      const wipeTransaction = await smartCoin.connect(signers.registrar).wipeFrozenAddress(investor1Address);


      await expect(wipeTransaction)
      .to.emit(smartCoin, 'Transfer').withArgs(investor1Address, ZERO_ADDRESS, mintingAmount);

      assert((await smartCoin.callStatic.balanceOf(investor1Address)).toString(), '0')

    });
    it('should wipeFrozenAddress from an investor', async () => {

      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await smartCoin
        .connect(signers.registrar)
        .freeze([investor1Address]);

      await smartCoin
        .connect(signers.registrar)
        .wipeFrozenAddress(investor1Address);
      assert.equal(
        (await smartCoin.balanceOf(registrarAddress)).toNumber(),
        0,
        'Invalid allowed amount ',
      );
    });

    it('should fail with only registrar could perform a burn', async () => {

      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      await expect(
        smartCoin.connect(signers.investor2).burn(mintingAmount),
      ).to.be.revertedWithCustomError(smartCoin, `UnauthorizedRegistrar`);
    });

    it('should not burn amount higher than current balance', async () => {
      const higherAmount = mintingAmount + 10;

      await smartCoin
        .connect(signers.registrar)
        .mint(investor1Address, mintingAmount);

      const currentBalance = (
        await smartCoin.balanceOf(registrarAddress)
      ).toNumber();

      await expect(smartCoin.connect(signers.registrar).burn(higherAmount))
        .to.be.revertedWithCustomError(smartCoin, `InsufficientBalance`)
        .withArgs(currentBalance, higherAmount);
    });
  });
});
