import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, CircleCheckIcon, ClockIcon, StoreIcon } from 'lucide-react';
import { Field } from '../../components/admin/Field';
import { api, apiErrorMessage } from '../../api/client';
import { StateView } from '../../components/trust/StateView';
import { useTrust } from '../../contexts/TrustContext';
import { useUser } from '../../contexts/UserContext';
import { directoryBenefits, directoryCategories } from '../../data/directory';

import { usePageMeta } from '../../hooks/usePageMeta';
import { track } from '../../utils/analytics';


import { inputClass, primaryButton, secondaryButton, textareaClass } from '../../utils/formStyles';


interface FormState {
  name: string;
  category: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  social: string;
  regNumber: string;
  hours: string;
  agree: boolean;
}

type Step = 'details' | 'review' | 'done';

const PHONE_RE = /^\+?[\d\s-]{10,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Register a business in the directory: details → review & pay ₦6,000/year → awaiting approval. */
export function DirectoryRegister() {
  const { session } = useUser();
  const { myBusiness, businesses } = useTrust();
  const reuseMine = Boolean(myBusiness.id) && !myBusiness.directory;
  const [step, setStep] = useState<Step>('details');
  const [tried, setTried] = useState(false);
  const [busy,setBusy]=useState(false);const [serverError,setServerError]=useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    name: reuseMine ? myBusiness.name : '',
    category: reuseMine ? myBusiness.category : '',
    description: reuseMine ? myBusiness.description : '',
    location: reuseMine ? myBusiness.location : '',
    phone: reuseMine ? myBusiness.phone : '',
    email: reuseMine ? myBusiness.email : session?.email ?? '',
    website: reuseMine ? myBusiness.website : '',
    social: reuseMine ? myBusiness.socials[0] ?? '' : '',
    regNumber: reuseMine ? myBusiness.regNumber : '',
    hours: 'Mon–Sat · 9am–6pm',
    agree: false
  }));

  usePageMeta({title:'List your business',description:'Register business details and submit evidence for review.'});

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length < 2) e.name = 'Enter your business name';else
    if (businesses.some((b) => b.id !== (reuseMine ? myBusiness.id : '') && b.name.trim().toLowerCase() === form.name.trim().toLowerCase())) e.name = 'A business with this name is already listed. Contact us if it’s yours.';
    if (!form.category) e.category = 'Choose a category';
    if (form.description.trim().length < 30) e.description = 'Describe what you do in at least 30 characters';
    if (form.location.trim().length < 3) e.location = 'Enter your address or area and city';
    if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +234 803 555 0100';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.website && /\s/.test(form.website.trim())) e.website = 'Enter a web address without spaces';
    if (!form.agree) e.agree = 'Confirm the details are accurate';
    return e;
  }, [form, businesses, reuseMine]);
  const valid = Object.keys(errors).length === 0;
  const err = (k: keyof FormState) => tried ? errors[k] : undefined;
  const set = <K extends keyof FormState,>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  if (!session) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-12">
        <StateView
          kind="unauthorized"
          title="Sign in to list your business"
          body="You’ll manage your listing, reviews and renewals from your PadiCheck account."
          action={
          <div className="flex flex-wrap justify-center gap-2">
              <Link to="/signup" state={{ from: '/directory/register' }} className="inline-flex h-12 items-center rounded-2xl bg-brand px-6 font-semibold text-white">
                Create account
              </Link>
              <Link to="/signin" state={{ from: '/directory/register' }} className="inline-flex h-12 items-center rounded-2xl px-6 font-semibold text-ink ring-1 ring-line">
                Log in
              </Link>
            </div>
          } />
        
      </div>);

  }

  const next = () => {
    setTried(true);
    if (!valid) {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    track('directory_listing_started', { category: form.category });
    setStep('review');
    window.scrollTo({ top: 0 });
  };

  const submitRegistration=async()=>{
    if(busy||!valid)return;setBusy(true);setServerError('');
    try{const response=await api<{business:{business_profile_id:string}}>('/v1/businesses',{auth:true,method:'POST',json:{canonical_name:form.name.trim(),business_category:form.category,profile_description:form.description.trim(),city:form.location.trim(),phone:form.phone.trim(),email:form.email.trim(),...(form.website.trim()?{website:/^https?:\/\//i.test(form.website.trim())?form.website.trim():'https://'+form.website.trim()}:{}),...(form.social.trim()?{social:form.social.trim()}:{}),...(form.regNumber.trim()?{registration_number:form.regNumber.trim()}:{}),...(form.hours.trim()?{opening_hours:form.hours.trim()}:{})}});setSavedId(response.business.business_profile_id);window.dispatchEvent(new Event('padicheck-data-updated'));setStep('done');window.scrollTo({top:0});}
    catch(error){setServerError(apiErrorMessage(error));}finally{setBusy(false);}
  };

  if (step === 'done') {
    return (
      <div className="mx-auto max-w-xl px-4 pt-12 text-center">
        <CircleCheckIcon className="mx-auto h-14 w-14 text-brand" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-ink">Business profile saved</h1>
        <p className="mt-2 text-ink-soft">
          Your draft profile is saved. Upload verification documents next. A staff review is required before your business is published. No payment has been taken.
        </p>
        <ol className="mx-auto mt-8 max-w-sm space-y-3 text-left">
          {[
          { text: 'Business details saved', done: true },
          { text: 'PadiCheck review', done: false },
          { text: 'Directory publication after review', done: false }].
          map((s, i) =>
          <li key={s.text} className="flex items-center gap-3">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${s.done ? 'bg-brand text-white' : i === 1 ? 'bg-sky-soft text-sky' : 'bg-canvas text-muted'}`}>
                {s.done ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : i === 1 ? <ClockIcon className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className="font-medium text-ink">{s.text}</span>
            </li>
          )}
        </ol>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link to={`/business/verification?business_profile_id=${savedId}`} className={primaryButton}>
            Continue to verification
          </Link>
          <Link to="/directory" className={secondaryButton}>
            Explore businesses
          </Link>
        </div>
      </div>);

  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:pt-12">
      <div>
        <p className="text-sm font-medium text-muted">{step === 'details' ? 'Step 1 of 2 · Business details' : 'Step 2 of 2 - Review details'}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">List your business on PadiCheck</h1>

        {step === 'details' ?
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="mt-6 space-y-5">
          
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Business name" error={err('name')} className="md:col-span-2">
                <input value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(err('name'))} autoComplete="organization" className={inputClass} />
              </Field>
              <Field label="Category" error={err('category')}>
                <select value={form.category} onChange={(e) => set('category', e.target.value)} aria-invalid={Boolean(err('category'))} className={inputClass}>
                  <option value="">Choose a category</option>
                  {directoryCategories.map((c) =>
                <option key={c.slug} value={c.label}>
                      {c.label}
                    </option>
                )}
                </select>
              </Field>
              <Field label="Registration number (optional)" hint="CAC RC or BN number — helps if you verify later">
                <input value={form.regNumber} onChange={(e) => set('regNumber', e.target.value)} placeholder="RC 1234567" className={inputClass} />
              </Field>
              <Field label="What does your business do?" error={err('description')} hint={`${form.description.trim().length}/30 characters minimum`} className="md:col-span-2">
                <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} aria-invalid={Boolean(err('description'))} className={textareaClass} />
              </Field>
              <Field label="Address or area" error={err('location')} className="md:col-span-2">
                <input value={form.location} onChange={(e) => set('location', e.target.value)} aria-invalid={Boolean(err('location'))} placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos" autoComplete="street-address" className={inputClass} />
              </Field>
              <Field label="Phone" error={err('phone')}>
                <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={Boolean(err('phone'))} autoComplete="tel" className={inputClass} />
              </Field>
              <Field label="Email" error={err('email')}>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={Boolean(err('email'))} autoComplete="email" className={inputClass} />
              </Field>
              <Field label="Website (optional)" error={err('website')}>
                <input value={form.website} onChange={(e) => set('website', e.target.value)} aria-invalid={Boolean(err('website'))} placeholder="yourbusiness.ng" inputMode="url" autoCapitalize="none" className={inputClass} />
              </Field>
              <Field label="Instagram or social page (optional)">
                <input value={form.social} onChange={(e) => set('social', e.target.value)} placeholder="instagram.com/yourbusiness" autoCapitalize="none" className={inputClass} />
              </Field>
              <Field label="Opening hours (optional)" className="md:col-span-2">
                <input value={form.hours} onChange={(e) => set('hours', e.target.value)} className={inputClass} />
              </Field>
            </div>
            <label className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
              <input type="checkbox" checked={form.agree} onChange={(e) => set('agree', e.target.checked)} aria-invalid={Boolean(err('agree'))} className="mt-1 h-5 w-5 accent-[rgb(var(--brand))]" />
              <span className="text-sm text-ink-soft">
                I own or manage this business and the details are accurate. I agree to the{' '}
                <Link to="/legal/verification-policy" className="font-semibold text-brand-dark underline">
                  listing policy
                </Link>
                . Customers can leave public reviews.
                {err('agree') && <span className="mt-1 block text-danger">{err('agree')}</span>}
              </span>
            </label>
            {tried && !valid &&
          <p role="alert" className="rounded-2xl bg-danger-soft p-3 text-sm text-danger">
                Please fix the highlighted fields.
              </p>
          }
            <button type="submit" className={`${primaryButton} w-full sm:w-auto`}>
              Review details
            </button>
          </form> :

        <section className="mt-6 space-y-5">
            {serverError&&<p role="alert" className="rounded-2xl bg-danger-soft p-3 text-sm text-danger">{serverError}</p>}
            <dl className="divide-y divide-line rounded-3xl bg-surface p-2 ring-1 ring-line">
              {[
            ['Business', form.name],
            ['Category', form.category],
            ['Location', form.location],
            ['Phone', form.phone],
            ['Email', form.email],
            ['Website', form.website || '—'],
            ['Opening hours', form.hours || '—']].
            map(([k, v]) =>
            <div key={k} className="flex gap-4 px-4 py-3">
                  <dt className="w-32 shrink-0 text-sm text-muted">{k}</dt>
                  <dd className="min-w-0 break-words font-medium text-ink">{v}</dd>
                </div>
            )}
            </dl>
            <div className="flex items-center justify-between rounded-3xl bg-brand-soft p-5">
              <div>
                <p className="font-semibold text-ink">Business registration</p>
                <p className="text-sm text-ink-soft">Your draft will be reviewed before publication.</p>
              </div>
              <p className="text-sm font-semibold text-ink">No payment taken</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep('details')} className={secondaryButton}>
                Edit details
              </button>
              <button type="button" disabled={busy} onClick={()=>void submitRegistration()} className={primaryButton}>
                {busy?'Saving...':'Save business profile'}
              </button>
            </div>
          </section>
        }
      </div>

      <aside className="lg:pt-12">
        <div className="rounded-3xl bg-surface p-6 ring-1 ring-line lg:sticky lg:top-24">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand-dark">
            <StoreIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-3xl font-bold text-ink">
            Business profile
            <span className="block text-base font-medium text-muted">Verification and publication require review</span>
          </p>
          <ul className="mt-5 space-y-4">
            {directoryBenefits.map((b) =>
            <li key={b.title}>
                <p className="font-semibold text-ink">{b.title}</p>
                <p className="text-sm text-ink-soft">{b.text}</p>
              </li>
            )}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
            Listing isn’t verification. Want the Verified badge too?{' '}
            <Link to="/for-business" className="font-semibold text-brand-dark">
              Get verified
            </Link>
          </p>
        </div>
      </aside>


      
    </div>);

}