import { type ReactNode, useState } from 'react';
import forms from '../data/apiForms.json';
import { api } from '../api/client';
import { useApiData } from '../hooks/useApiData';
import { ApiState, SimpleForm, inputStyle, panelStyle } from './ApiUI';
type Property = {
    type?: string;
    enum?: unknown[];
    nullable?: boolean;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    format?: string;
};
type Schema = {
    properties?: Record<string, Property>;
    required?: string[];
};
export const fieldLabel = (name: string) => name.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
export function SchemaForm({ operation, path, defaults = {}, after, omit = [], label = 'Submit' }: {
    operation: string;
    path: string;
    defaults?: Record<string, unknown>;
    after?: (result: Record<string, unknown>) => void;
    omit?: string[];
    label?: string;
}) {
    const schema = (forms as Record<string, Schema>)[operation];
    if (!schema)
        return <p className="text-muted">This action has no documented form.</p>;
    return <SimpleForm label={label} submit={async (data) => {
            const payload: Record<string, unknown> = { ...defaults };
            for (const [key, property] of Object.entries(schema.properties ?? {})) {
                if (key in defaults || omit.includes(key))
                    continue;
                const value = String(data.get(key) ?? '');
                if (!value)
                    continue;
                payload[key] = property.type === 'boolean' ? value === 'true' : ['integer', 'number'].includes(property.type ?? '') ? Number(value) : ['array', 'object'].includes(property.type ?? '') ? JSON.parse(value) : value;
            }
            const result = await api<Record<string, unknown>>(path, { auth: true, method: operation.split(' ')[0], json: payload });
            after?.(result);
        }}>{Object.entries(schema.properties ?? {}).filter(([key]) => !(key in defaults) && !omit.includes(key)).map(([key, property]) => <label key={key} className="block text-sm text-ink">{fieldLabel(key)}{schema.required?.includes(key) ? ' *' : ' (optional)'}
    {property.enum || property.type === 'boolean' ? <select name={key} required={schema.required?.includes(key)} className={inputStyle}><option value="">Choose</option>{(property.enum ?? [true, false]).filter((value) => value !== null).map((value) => <option key={String(value)} value={String(value)}>{String(value)}</option>)}</select> : ['object', 'array'].includes(property.type ?? '') || (property.maxLength ?? 0) > 500 ? <textarea name={key} required={schema.required?.includes(key)} maxLength={property.maxLength} rows={4} className={inputStyle} placeholder={['object', 'array'].includes(property.type ?? '') ? 'JSON configuration' : undefined}/> : <input name={key} type={['integer', 'number'].includes(property.type ?? '') ? 'number' : property.format === 'email' ? 'email' : 'text'} required={schema.required?.includes(key)} min={property.minimum} max={property.maximum} minLength={property.minLength} maxLength={property.maxLength} step={property.type === 'number' ? 'any' : undefined} className={inputStyle}/>}
  </label>)}</SimpleForm>;
}
export function RecordView({ record }: {
    record: Record<string, unknown>;
}) {
    return <dl className="space-y-2">{Object.entries(record).filter(([key, value]) => value !== null && value !== undefined && !/(secret|password|token|hash)/i.test(key)).map(([key, value]) => <div key={key}><dt className="text-xs font-medium text-muted">{fieldLabel(key)}</dt><dd className="whitespace-pre-wrap break-words text-sm text-ink">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</dd></div>)}</dl>;
}
export function ResourceList({ path, collection, auth = true, render, title, paginate = true }: {
    path: string;
    collection: string;
    auth?: boolean;
    render?: (row: Record<string, unknown>, refresh: () => void) => ReactNode;
    title?: string;
    paginate?: boolean;
}) {
    const [offset, setOffset] = useState(0);
    const state = useApiData<Record<string, unknown>>(paginate ? `${path}${path.includes('?') ? '&' : '?'}limit=20&offset=${offset}` : path, auth);
    const rows = (state.data?.[collection] ?? []) as Record<string, unknown>[];
    return <section className="space-y-4">{title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}<ApiState {...state}/><button type="button" onClick={state.refresh} className="text-sm font-semibold text-brand-dark">Refresh</button>{state.data && rows.length === 0 && <p className="text-sm text-muted">No records on this page.</p>}{rows.map((row, index) => <div key={String(row.investigation_id ?? row.business_profile_id ?? row.user_report_id ?? row.verification_request_id ?? row.dispute_id ?? row.share_link_id ?? index)} className={panelStyle}>{render ? render(row, state.refresh) : <RecordView record={row}/>}</div>)}{paginate && <div className="flex gap-4 text-sm text-ink"><button disabled={!offset || state.loading} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button><button disabled={state.loading || rows.length !== 20 || offset >= 10000} onClick={() => setOffset(offset + 20)}>Next</button></div>}</section>;
}
