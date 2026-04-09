import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SellerWarehouse – redirects to the Store & Pickup tab in SellerDashboard.
 * Warehouse management is fully integrated into SellerStoreSettings.
 */
export default function SellerWarehouse() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/seller?tab=store', { replace: true });
  }, [navigate]);

  return null;
}
