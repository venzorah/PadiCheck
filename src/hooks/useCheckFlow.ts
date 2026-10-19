import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePwa } from '../contexts/PwaContext';
import { useUser } from '../contexts/UserContext';
import { getCheckType, makeId } from '../utils/checks';
import { takeSharedFiles } from '../utils/shareInbox';
import { buildInvestigation, type ResearchContext } from '../utils/investigations';
import { investigationsApi } from '../api/investigations';
import { mediaApi } from '../api/media';
import { ApiError, apiErrorMessage } from '../api/client';
import type { InputMode, UploadItem } from '../types/check';
import type { MediaRecord } from '../types/investigation';

export function useCheckFlow() {
  const { type } = useParams<{ type: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { online } = usePwa();
  const { hasPermission } = useUser();
  const option = getCheckType(type);
  const context: ResearchContext = type && ['business', 'phone', 'website', 'person', 'social', 'listing'].includes(type) ? type as ResearchContext : option.id;
  const initial = params.get('mode');
  const [mode, setMode] = useState<InputMode>(context === 'phone' ? 'text' : option.id === 'contract' ? 'upload' : context === 'website' ? 'link' : initial === 'camera' || initial === 'upload' || initial === 'text' || initial === 'link' ? initial : option.id === 'link' || params.has('url') ? 'link' : 'text');
  const [url, setUrl] = useState(params.get('url') ?? '');
  const [text, setText] = useState(params.get('text') ?? '');
  const [uploads, setUploads] = useState<UploadItem[]>(() => takeSharedFiles().map((file) => ({ id: makeId('f'), file, progress: 0, status: 'ready' })));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const inFlight = useRef(false);
  const controller = useRef<AbortController>();
  const uploaded = useRef(new Map<File, MediaRecord>());
  useEffect(() => () => controller.current?.abort(), []);
  const allowed = hasPermission('investigations.create');
  const ready = online && allowed && !busy && !uncertain && text.length <= 10000 && (mode === 'text' ? text.trim().length > 0 : mode === 'link' ? url.trim().length > 0 : mode === 'upload' ? uploads.length > 0 && uploads.length <= 10 && uploads.every((u) => u.status !== 'error' && u.file.size > 0 && u.file.size <= 10 * 1024 * 1024 && (u.file.type === 'application/pdf' || /\.pdf$/i.test(u.file.name))) : false);
  const summary = mode === 'link' ? url : mode === 'text' ? text.slice(0, 100) : `${uploads.length} PDF document(s)`;
  const confirm = async () => {
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setConfirmOpen(false);
    setBusy(true);
    setError('');
    const abort = new AbortController();
    controller.current = abort;
    let creating = false;
    try {
      const mediaIds: string[] = [];
      if (mode === 'upload') {
        for (const [index, item] of uploads.entries()) {
          setStage(`Uploading document ${index + 1} of ${uploads.length}...`);
          let media = uploaded.current.get(item.file);
          if (!media) {
            const response = await mediaApi.upload(item.file, abort.signal);
            media = response.media;
            uploaded.current.set(item.file, media);
          }
          if (media.upload_status !== 'ready' || media.media_type !== 'document') throw new Error('The uploaded document is not ready for analysis.');
          mediaIds.push(media.media_id);
        }
      }
      const input = buildInvestigation({ type: context, mode: mode as 'link' | 'text' | 'upload', text, url, mediaIds });
      setStage('Submitting investigation...');
      creating = true;
      const result = await investigationsApi.create(input, abort.signal);
      navigate(`/result/${result.investigation.investigation_id}`, { replace: true, state: { dispatch: result.dispatch } });
    } catch (failure) {
      if (abort.signal.aborted) return;
      if (creating && (!(failure instanceof ApiError) || failure.status >= 500 || failure.code === 'invalid_response')) {
        setUncertain(true);
        setError('The submission could not be confirmed. Check History before starting another check; the server may have saved it.');
      } else if (failure instanceof ApiError && failure.status === 402) {
        setError('You have no investigation units available. Billing integration is not available on this screen yet.');
      } else setError(failure instanceof ApiError ? apiErrorMessage(failure) : failure instanceof Error ? failure.message : 'Could not submit this check.');
    } finally { inFlight.current = false; if (!abort.signal.aborted) setBusy(false); }
  };
  return { option, context, mode, setMode, url, setUrl, text, setText, uploads, setUploads, confirmOpen, setConfirmOpen, busy, stage, error, uncertain, allowed, ready, online, summary, confirm };
}
