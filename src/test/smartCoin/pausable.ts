import { SmartCoin } from '../../../dist/types';
import { expect, assert } from 'chai';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { deploySmartCoinFixture, deploySmartCoinV3Fixture } from '../utils/builders';
import { getOperatorSigners } from '../utils/signers';
import { Signer } from 'ethers';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

context('SmartCoin Pausable', () => {
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
        technical: Signer;
    };

    let registrarAddress: string;
    let investor1Address: string;
    let investor2Address: string;

    beforeEach(async () => {
        smartCoin = await loadFixture(deploySmartCoinFixture);
        signers = await getOperatorSigners();

        registrarAddress = await signers.registrar.getAddress();
        investor1Address = await signers.investor1.getAddress();
        investor2Address = await signers.investor2.getAddress();
    });

    it('Should pause the contract', async () => {

        const pauseTransaction = await smartCoin
            .connect(signers.registrar)
            .pause();

        await expect(pauseTransaction)
            .to.emit(smartCoin, 'Paused');
    });
    it('Only registrar could pause the contract', async () => {

        const pauseTransaction = smartCoin
            .connect(signers.technical)
            .pause();

        await expect(pauseTransaction)
            .to.be.revertedWithCustomError(smartCoin, 'UnauthorizedRegistrar');
    });
    it('Only registrar could unpause the contract', async () => {

        const pauseTransaction = smartCoin
            .connect(signers.technical)
            .unpause();

        await expect(pauseTransaction)
            .to.be.revertedWithCustomError(smartCoin, 'UnauthorizedRegistrar');
    });

    it('Should unpause the contract', async () => {
        await smartCoin
            .connect(signers.registrar)
            .pause();
        const unPauseTransaction = await smartCoin
            .connect(signers.registrar)
            .unpause();

        await expect(unPauseTransaction)
            .to.emit(smartCoin, 'UnPaused');
    });
    it('Should not be unpause an already unpaused contract', async () => {
        await smartCoin
            .connect(signers.registrar)
            .pause();
        await smartCoin
            .connect(signers.registrar)
            .unpause();
        const unPauseTransaction2 = smartCoin
            .connect(signers.registrar)
            .unpause();

        expect(unPauseTransaction2).to.be.revertedWithCustomError(
            smartCoin,
            'ContractNotPaused',
        );
    });
    it('Should not be pause an already paused contract', async () => {
        await smartCoin
            .connect(signers.registrar)
            .pause();
        const pauseTransaction2 = smartCoin
            .connect(signers.registrar)
            .pause();

        expect(pauseTransaction2).to.be.revertedWithCustomError(
            smartCoin,
            'ContractPaused',
        );
    });
    context("Frobiden actions when contract is paused", async () => {
        beforeEach(async () => {
            await smartCoin.connect(signers.registrar).pause();
        });
        it('Should not transfer when contract is paused ', async () => {
            await expect(
                smartCoin
                    .connect(signers.investor3)
                    .transfer(investor1Address, 1),
            )
                .to.be.revertedWithCustomError(smartCoin, `ContractPaused`);
        });

        it('Should not transfer from when contract is paused', async () => {
            await expect(
                smartCoin
                    .connect(signers.investor1)
                    .transferFrom(investor1Address, investor2Address, 1),
            )
                .to.be.revertedWithCustomError(smartCoin, `ContractPaused`)
        });
        it('Should not approve from when contract is paused', async () => {
            await expect(
                smartCoin
                    .connect(signers.investor1)
                    .approve(investor1Address, 1),
            )
                .to.be.revertedWithCustomError(smartCoin, `ContractPaused`)
        });
        it('Should not increaseAllowance when contract is paused', async () => {
            await expect(
                smartCoin
                    .connect(signers.investor1)
                    .increaseAllowance(investor1Address, 1),
            )
                .to.be.revertedWithCustomError(smartCoin, `ContractPaused`)
        });
        it('Should not decreaseAllowance when contract is paused', async () => {
            await expect(
                smartCoin
                    .connect(signers.investor1)
                    .decreaseAllowance(investor1Address, 1),
            )
                .to.be.revertedWithCustomError(smartCoin, `ContractPaused`)
        });
    });
    context("Allowed actions when contract is paused", async () => {
        beforeEach(async () => {
            await smartCoin.connect(signers.registrar).pause();
        });
        it("Should allow registrar to mint tokens", async () => {
            const amountToMint = 10;
            const mintTx = await smartCoin
                .connect(signers.registrar)
                .mint(investor1Address, amountToMint);
            expect(mintTx).to.emit(smartCoin, "Transfer").withArgs(ZERO_ADDRESS, investor1Address, amountToMint)
        });
        it("Should allow registrar to burn tokens", async () => {
            const amountToBurn = 10;

            await smartCoin
            .connect(signers.registrar)
            .mint(registrarAddress, amountToBurn);

            const burnTx = await smartCoin
                .connect(signers.registrar)
                .burn(amountToBurn);
            expect(burnTx).to.emit(smartCoin, "Transfer").withArgs(registrarAddress, ZERO_ADDRESS, amountToBurn)
        });
    });
});

