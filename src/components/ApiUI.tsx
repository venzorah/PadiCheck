import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { Link } from 'react-router-dom';
export const inputStyle = 'mt-1 block w-full rounded-xl bg-canvas p-3 text-ink ring-1 ring-line';
export const buttonStyle = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50';
export const panelStyle = 'space-y-4 rounded-3xl bg-surface p-5';
export function ApiState({ loading, error }: {
    loading?: boolean;
    error?: unknown;
}) { return <>{loading && <p role="status" className="text-sm text-muted">Loading...</p>}{Boolean(error) && <p role="alert" className="text-sm text-danger">{apiErrorMessage(error)}</p>}</>; }
export function Action({ run, children, danger = false, after }: {
    run: () => Promise<unknown>;
    children: ReactNode;
    danger?: boolean;
    after?: () => void;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const lock = useRef(false);
    return <div className="inline-block"><button type="button" disabled={busy} className={`${buttonStyle} ${danger ? 'bg-danger' : ''}`} onClick={async () => {
            if (lock.current || (danger && !window.confirm('Confirm this action?')))
                return;
            lock.current = true;
            setBusy(true);
            setError(null);
            try {
                await run();
                after?.();
            }
            catch (failure) {
                setError(failure);
            }
            finally {
                lock.current = false;
                setBusy(false);
            }
        }}>{busy ? 'Working...' : children}</button><ApiState error={error}/></div>;
}
export function Unavailable({ title, reason }: {
    title: string;
    reason: string;
}) { return <section className={`${panelStyle} mx-auto my-6 max-w-4xl`}><h1 className="text-xl font-bold text-ink">{title}</h1><p className="text-muted">{reason}</p><Link to="/" className="font-semibold text-brand-dark">Home</Link></section>; }
export function SimpleForm({ submit, children, label = 'Save' }: {
    submit: (data: FormData) => Promise<unknown>;
    children: ReactNode;
    label?: string;
}) {
    const [completed, setCompleted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const lock = useRef(false);
    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (lock.current)
            return;
        const data = new FormData(event.currentTarget);
        lock.current = true;
        setBusy(true);
        setError(null);
        setCompleted(false);
        try {
            await submit(data);
            setCompleted(true);
        }
        catch (failure) {
            setError(failure);
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    };
    return <form onSubmit={onSubmit} className="space-y-3"><fieldset disabled={busy} className="space-y-3">{children}</fieldset><ApiState error={error}/>{completed && <p role="status" className="text-sm text-brand-dark">Request completed.</p>}<button disabled={busy} className={buttonStyle}>{busy ? 'Working...' : label}</button></form>;
}
