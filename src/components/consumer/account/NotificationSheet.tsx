import { BottomSheet } from '../../BottomSheet';
import { useApiData } from '../../../hooks/useApiData';
import { notificationsApi, type NotificationKind } from '../../../api/notifications';
import { Action, ApiState } from '../../ApiUI';
const labels: Record<NotificationKind, string> = { 'investigation.completed': 'Completed investigations', 'investigation.failed': 'Failed investigations', 'business.invitation': 'Business invitations' };
export function NotificationSheet({ open, onClose }: {
    open: boolean;
    onClose: () => void;
}) { const state = useApiData<{
    preferences: {
        notification_type: NotificationKind;
        enabled: boolean;
    }[];
}>(open ? '/v1/me/notification-preferences' : null); return <BottomSheet open={open} onClose={onClose} title="In-app notification preferences"><p className="mb-4 text-sm text-muted">Preferences affect future in-app events. Email and push are unavailable.</p><ApiState {...state}/>{state.data?.preferences.map(row => <div key={row.notification_type} className="flex items-center justify-between gap-3 border-b border-line py-3"><span className="text-ink">{labels[row.notification_type]}</span><Action run={() => notificationsApi.setPreference(row.notification_type, !row.enabled)} after={state.refresh}>{row.enabled ? 'Turn off' : 'Turn on'}</Action></div>)}</BottomSheet>; }
