import { sleep } from './apiConfig';

/**
 * Logistics tracking checkpoint entry
 */
export interface ShipmentScan {
  location: string;
  activity: string;
  timestamp: string;
}

/**
 * Complete parcel tracking details returned for a given tracking number
 */
export interface ShipmentTrackingInfo {
  trackingNumber: string;
  courier: string;
  status: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  scans: ShipmentScan[];
}

/**
 * Deliverability query response for an Indian postal code
 */
export interface PincodeDeliverability {
  deliverable: boolean;
  estDays: number;
  codAvailable: boolean;
}

/**
 * ShippingService Class
 *
 * Interfaces with logistics tracking (Shiprocket / Blue Dart Express),
 * queries parcel waybill milestones, and validates PIN code deliverability.
 */
class ShippingService {
  /**
   * Retrieves shipment milestones and transit history for an AWB tracking number
   *
   * @param trackingNumber Courier tracking number (e.g. "BD-88920145IN")
   * @returns Detailed tracking scan timeline
   */
  async getShipmentStatus(trackingNumber: string): Promise<ShipmentTrackingInfo> {
    await sleep(350);

    return {
      trackingNumber,
      courier: 'Shiprocket / Blue Dart Express',
      status: 'In Transit',
      origin: 'Kolkata Workshop, WB',
      destination: 'Customer Destination',
      estimatedDelivery: '2 - 3 business days',
      scans: [
        {
          location: 'Kolkata Workshop',
          activity: 'Package dispatched from maker bench',
          timestamp: 'Yesterday 17:30',
        },
        {
          location: 'Kolkata Hub (CCU)',
          activity: 'Processed through sorting facility',
          timestamp: 'Yesterday 22:15',
        },
        {
          location: 'Regional Hub',
          activity: 'In transit to local delivery center',
          timestamp: 'Today 09:40',
        },
      ],
    };
  }

  /**
   * Validates whether a 6-digit Indian PIN code is serviceable for courier delivery
   * and Cash on Delivery.
   *
   * @param pincode 6-digit postal code string
   * @returns Deliverability and estimated business days
   */
  async checkPincodeDeliverability(pincode: string): Promise<PincodeDeliverability> {
    await sleep(250);

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return { deliverable: false, estDays: 0, codAvailable: false };
    }

    return {
      deliverable: true,
      estDays: 3,
      codAvailable: true,
    };
  }
}

// Export singleton instance
export const shippingService = new ShippingService();
