import {bulkPositions, scopedPartnerShare, trackingFlags, viewerAccess} from '../customBusiness';
import {whatsAppLink} from '../whatsapp';

describe('custom business', () => {
  it('sets buy, produce, and sell flags from the tracking mode', () => {
    expect(trackingFlags('resale')).toMatchObject({buys: true, produces: false, sells: true});
    expect(trackingFlags('manufacture')).toMatchObject({buys: true, produces: true, sells: true});
    expect(trackingFlags('service')).toMatchObject({buys: false, produces: false, sells: true});
    expect(trackingFlags('household')).toMatchObject({
      buys: true,
      sells: false,
      tracksCredit: false,
      tracksBilling: false,
    });
  });

  it('keeps bought, produced, and sold quantities and the stock left', () => {
    const [row] = bulkPositions([
      {productId: 'atta', direction: 'buy', quantity: '10'},
      {productId: 'atta', direction: 'produce', quantity: '2.5'},
      {productId: 'atta', direction: 'sell', quantity: '4'},
    ]);
    expect(row).toEqual({
      productId: 'atta',
      bought: '10.000',
      produced: '2.500',
      sold: '4.000',
      onHand: '8.500',
    });
  });

  it('shares only the sales and expenses passed in', () => {
    expect(scopedPartnerShare({sales: '200.00', expenses: '40.00', sharePercent: '40'})).toEqual({
      sharedNet: '160.00',
      partnerShare: '64.00',
    });
  });

  it('limits an assistant to the businesses and products they were added on', () => {
    const access = viewerAccess('assistant', '9876543210', [
      {phone: '9876543210', businessId: 'stall', productId: 'tea', active: true},
      {phone: '9000000000', businessId: 'mill', productId: null, active: true},
    ]);
    expect(access.viewOnly).toBe(true);
    expect(access.businessIds).toEqual(['stall']);
    expect(access.productIds('stall')).toEqual(['tea']);
    expect(viewerAccess('owner', '9876543210', []).businessIds).toBeNull();
  });

  it('builds a WhatsApp link for a 10-digit mobile', () => {
    expect(whatsAppLink('9876543210', 'बाकी ₹10.00')).toBe(
      'https://wa.me/919876543210?text=' + encodeURIComponent('बाकी ₹10.00'),
    );
    expect(whatsAppLink('123', 'hi')).toBeNull();
  });
});
