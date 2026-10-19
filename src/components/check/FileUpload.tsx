import { type Dispatch, type SetStateAction } from 'react';
import { CloudUploadIcon, FileTextIcon, XIcon } from 'lucide-react';
import { formatBytes, makeId } from '../../utils/checks';
import type { UploadItem } from '../../types/check';

export function FileUpload({ items, onChange, accept, formats, dataSaver }: {
  items: UploadItem[]; onChange: Dispatch<SetStateAction<UploadItem[]>>;
  accept: string; formats: string; dataSaver: boolean;
}) {
  const add = (files: FileList | null) => {
    if (!files) return;
    onChange((previous) => [...previous, ...Array.from(files).map((file): UploadItem => {
      const error = !(file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) ? 'Choose a PDF document; this format cannot be analyzed.' : file.size > 10 * 1024 * 1024 ? 'Larger than the 10 MB upload limit.' : file.size === 0 ? 'The file is empty.' : undefined;
      return { id: makeId('f'), file, progress: 0, status: error ? 'error' : 'ready', error };
    })]);
  };
  return <div>
    <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); add(event.dataTransfer.files); }} className="flex min-h-[156px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-surface px-6 text-center">
      <CloudUploadIcon className="h-8 w-8 text-brand" aria-hidden="true" /><span className="mt-3 font-semibold text-ink">Choose documents</span><span className="mt-1 text-sm text-muted">{formats}</span>
      <input type="file" multiple accept={accept} className="sr-only" onChange={(event) => { add(event.target.files); event.target.value = ''; }} />
    </label>
    {items.length > 10 && <p role="alert" className="mt-3 text-sm text-danger">Remove documents until there are at most ten.</p>}
    <ul className="mt-3 divide-y divide-line rounded-3xl bg-surface">{items.map((item) => <li key={item.id} className="flex items-center gap-3 p-3">
      <FileTextIcon className="h-5 w-5 shrink-0 text-muted" /><div className="min-w-0 flex-1"><p className="truncate font-medium text-ink">{item.file.name}</p><p className={`text-sm ${item.error ? 'text-danger' : 'text-muted'}`}>{item.error || `${formatBytes(item.file.size)} - Selected; not uploaded yet`}</p>{dataSaver && item.file.size > 5 * 1024 * 1024 && <p className="text-xs text-muted">Large document: uploading will use mobile data.</p>}</div>
      <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => onChange((list) => list.filter((row) => row.id !== item.id))} className="grid h-11 w-11 place-items-center rounded-full text-muted"><XIcon className="h-4 w-4" /></button>
    </li>)}</ul>
  </div>;
}
