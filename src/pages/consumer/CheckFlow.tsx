import { Link2Icon, PencilLineIcon, UploadIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BottomSheet } from '../../components/BottomSheet';
import { PageHeader } from '../../components/consumer/PageHeader';
import { FileUpload } from '../../components/check/FileUpload';
import { useCheckFlow } from '../../hooks/useCheckFlow';
import { useUser } from '../../contexts/UserContext';
import { investigationLabels } from '../../utils/investigations';
import type { InputMode } from '../../types/check';

const tabs = [{ id: 'link', label: 'Link', icon: Link2Icon }, { id: 'text', label: 'Describe', icon: PencilLineIcon }, { id: 'upload', label: 'Documents', icon: UploadIcon }] as const;
export function CheckFlow() {
  const flow = useCheckFlow();
  const { dataSaver } = useUser();
  const input = 'mt-2 w-full rounded-2xl bg-surface p-4 text-base text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand';
  const researchType = flow.context === 'phone' ? 'phone_lookup' : flow.context === 'business' ? 'company_research' : flow.option.id === 'contract' ? 'contract_review' : flow.mode === 'link' ? 'web_analysis' : 'general_research';
  return (
    <>
      <PageHeader back title={investigationLabels[researchType]} />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 lg:space-y-0 lg:px-10">
        <section>
          <div role="tablist" aria-label="Input type" className="flex gap-2">
            {tabs.filter((tab) => flow.context === 'phone' ? tab.id === 'text' : flow.option.id !== 'contract' || tab.id === 'upload').map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={flow.mode === tab.id} disabled={flow.busy} onClick={() => flow.setMode(tab.id as InputMode)} className={`inline-flex h-11 items-center gap-2 rounded-full px-4 font-medium ${flow.mode === tab.id ? 'bg-ink text-white' : 'bg-surface text-ink ring-1 ring-line'}`}><tab.icon className="h-4 w-4" />{tab.label}</button>)}
          </div>
          <fieldset disabled={flow.busy} className="mt-5">
            {flow.mode === 'link' && <label className="block text-sm font-medium text-ink">Link to research<input type="url" maxLength={2048} value={flow.url} onChange={(e) => flow.setUrl(e.target.value)} placeholder="https://example.com" className={input} /></label>}
            {(flow.mode === 'text' || flow.mode === 'link' || flow.mode === 'upload') && <label className="mt-4 block text-sm font-medium text-ink">{flow.mode === 'text' ? 'What would you like to research?' : 'Research instructions (optional)'}<textarea rows={5} maxLength={10000} value={flow.text} onChange={(e) => flow.setText(e.target.value)} className={input} placeholder="Describe the opportunity and the questions you want answered." /></label>}
            {flow.mode === 'upload' && <div className="mt-4"><FileUpload items={flow.uploads} onChange={flow.setUploads} accept="application/pdf,.pdf" formats="PDF only, up to 10 MB per document; ten documents maximum" dataSaver={dataSaver} /><p className="mt-3 text-sm text-muted">Documents upload privately when you submit. Keep this page open until submission is confirmed.</p></div>}
            {flow.mode === 'camera' && <p className="rounded-2xl bg-surface p-5 text-muted">Camera and image analysis are not available yet. Describe what you want researched or choose a PDF document above.</p>}
          </fieldset>
          {flow.context === 'phone' && <p className="mt-3 text-sm text-muted">Enter one phone number with its international country code, for example +2348012345678. Research does not guarantee the number owner's identity.</p>}
          {!flow.allowed && <p role="alert" className="mt-4 text-sm text-danger">Your account does not have permission to create investigations.</p>}
          {!flow.online && <p role="status" className="mt-4 text-sm text-muted">Reconnect to submit. Checks are not submitted automatically while offline.</p>}
          {flow.error && <p role="alert" className="mt-4 rounded-2xl bg-danger-soft p-4 text-sm text-danger">{flow.error}</p>}
          {flow.busy && <p role="status" className="mt-4 text-sm text-muted">{flow.stage}</p>}
          {flow.uncertain && <Link to="/history" className="mt-4 inline-block font-semibold text-brand-dark">Check History</Link>}
        </section>
        <aside className="rounded-3xl bg-surface p-6">
          <h2 className="font-semibold text-ink">{investigationLabels[researchType]}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">Research uses available sources and returns findings with evidence and limitations. It does not guarantee identity, registration, safety or authenticity.</p>
          <p className="mt-4 text-sm text-muted">When billing is enabled, a new investigation uses one unit. The server confirms availability. Failed investigations can be retried without a new charge.</p>
          <p className="mt-3 text-sm text-muted">Your draft is held only on this page and clears when you leave.</p>
          <button type="button" disabled={!flow.ready} onClick={() => flow.setConfirmOpen(true)} className="mt-6 h-12 w-full rounded-2xl bg-brand font-semibold text-white disabled:opacity-50">Review and submit</button>
        </aside>
      </div>
      <BottomSheet open={flow.confirmOpen} onClose={() => flow.setConfirmOpen(false)} title="Submit this investigation?" footer={<button type="button" disabled={!flow.ready} onClick={() => void flow.confirm()} className="h-12 w-full rounded-2xl bg-brand font-semibold text-white disabled:opacity-50">Submit investigation</button>}>
        <p className="break-words text-ink">{flow.summary}</p><p className="mt-4 text-sm text-muted">Processing may be queued or deferred. Availability of independent search and AI analysis depends on the configured services.</p>
      </BottomSheet>
    </>
  );
}
