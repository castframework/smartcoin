import { expect } from 'chai';
import { getSmartCoinDataLayout } from '../utils/dataLayout';
import '../utils/chai-eth-layout-snapshot';

describe('SmartCoin - Data Layout', function () {
  it('should not change layout', function () {
    const layout = getSmartCoinDataLayout('smartCoin/SmartCoin.sol');

    expect(layout).to.be.compatibleWithSnapshot(this);
  });
});
