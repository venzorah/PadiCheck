import { Link } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '../../components/consumer/PageHeader';
import { Action, ApiState, panelStyle } from '../../components/ApiUI';
import { useApiData } from '../../hooks/useApiData';
import { bookmarksApi, type Bookmark } from '../../api/bookmarks';
import { statusLabels } from '../../utils/investigations';
export function Saved() {
    const [offset, setOffset] = useState(0);
    const list = useApiData<{
        bookmarks: Bookmark[];
    }>(`/v1/me/bookmarks?limit=20&offset=${offset}`);
    return <><PageHeader title="Saved investigations"/><div className="mx-auto max-w-3xl space-y-4 px-4 pb-10"><ApiState {...list}/>{list.data?.bookmarks.length === 0 && <p className="text-muted">No saved investigations on this page.</p>}{list.data?.bookmarks.map(row => <section key={row.investigation_id} className={panelStyle}><Link to={`/result/${row.investigation_id}`} className="font-semibold text-brand-dark">{row.title || row.investigation_type}</Link><p className="text-sm text-muted">{statusLabels[row.status]} · Saved {new Date(row.bookmarked_at).toLocaleString()}</p><Action run={() => bookmarksApi.remove(row.investigation_id)} after={list.refresh}>Remove bookmark</Action></section>)}<div className="flex gap-4"><button disabled={!offset || list.loading} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button><button disabled={list.loading || list.data?.bookmarks.length !== 20 || offset >= 10000} onClick={() => setOffset(offset + 20)}>Next</button></div><p className="text-xs text-muted">Bookmarks are private to your account. Reports require a connection.</p></div></>;
}
