import { BottomSheet } from '../BottomSheet';
import { Link } from 'react-router-dom';
export function CheckoutSheet({ open, onClose }: {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    amountNaira?: number;
    onPaid?: (method: string, reference: string) => void;
}) { return <BottomSheet open={open} onClose={onClose} title="Provider-hosted checkout"><p className="text-muted">Direct card entry and simulated payments are unavailable.</p><Link to="/account/billing" onClick={onClose} className="text-brand-dark">View configured billing offers</Link></BottomSheet>; }
