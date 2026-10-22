import { useRef, useState } from 'react';
import { mediaApi } from '../api/media';
import { SimpleForm, inputStyle } from './ApiUI';
export function EvidenceUpload({ onChange }: {
    onChange: (ids: string[]) => void;
}) {
    const [ids, setIds] = useState<string[]>([]);
    const uploaded = useRef(new Map<string, string>());
    return <div className="space-y-3"><p className="text-sm text-muted">Upload up to ten private evidence files, at most 10 MiB each. Storage supports selected images, audio/video and PDF; this does not enable image or audio AI analysis.</p><SimpleForm label="Upload private evidence" submit={async (data) => {
            const files = data.getAll('file').filter((value): value is File => value instanceof File && value.size > 0);
            if (!files.length || files.length > 10)
                throw new Error('Choose one to ten files.');
            const next: string[] = [];
            for (const file of files) {
                if (file.size > 10 * 1024 * 1024)
                    throw new Error('A file exceeds the 10 MiB limit.');
                const key = `${file.name}:${file.size}:${file.lastModified}`;
                let id = uploaded.current.get(key);
                if (!id) {
                    const response = await mediaApi.upload(file);
                    if (response.media.upload_status !== 'ready')
                        throw new Error('Evidence is not ready.');
                    id = response.media.media_id;
                    uploaded.current.set(key, id);
                }
                next.push(id);
            }
            setIds(next);
            onChange(next);
        }}><input type="file" name="file" multiple required accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,audio/mpeg,audio/wav,audio/flac,audio/ogg" className={inputStyle}/></SimpleForm>{ids.length > 0 && <p role="status" className="text-sm text-brand-dark">{ids.length} private evidence file(s) ready for the next submission.</p>}</div>;
}
