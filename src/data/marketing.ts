import { BrainCircuitIcon, FileCheck2Icon, ScaleIcon, SearchIcon, ShieldCheckIcon, UsersIcon, EyeIcon, type LucideIcon } from 'lucide-react';

export const howSteps: {title: string;body: string;icon: LucideIcon;}[] = [{"title":"Submit","body":"Choose a link, description or supported PDF document.","icon":SearchIcon},{"title":"Collect sources","body":"Background processing collects the submitted references when workers are available.","icon":FileCheck2Icon},{"title":"Analyze available evidence","body":"Independent search and AI analysis run only when configured and enabled.","icon":BrainCircuitIcon},{"title":"Review findings","body":"Read sources, uncertainty and verification status. Numerical Trust Scores are unavailable.","icon":EyeIcon},{"title":"Decide","body":"Save investigations to your account or explicitly share a limited completed result.","icon":ScaleIcon}];


export const popularChecks = [{type:'phone',q:'+2348012345678',label:'A phone number',result:'Start a new research request'},{type:'website',q:'https://example.com',label:'A website',result:'Start a new research request'},{type:'job',q:'Research this job offer and its available evidence',label:'A job offer',result:'Start a new research request'},{type:'business',q:'Example Business',label:'A business',result:'Start a new research request'}] as const;

export const whyPoints: {title: string;body: string;icon: LucideIcon;}[] = [
{ title: 'Facts are labelled', body: 'Verified information, user reports and AI signals are always shown separately. We never present a guess as a fact.', icon: EyeIcon },
{ title: 'People review reports', body: 'Published incident reports are moderated user allegations. Eligible users may dispute them.', icon: UsersIcon },
{ title: 'Built for how we buy', body: 'WhatsApp sellers, Instagram vendors, rental agents and remote jobs — the places trust is hardest.', icon: ShieldCheckIcon }];


export const safetyTips = [
{ title: 'Never pay to get a job', body: 'Real employers don’t charge registration, training or uniform fees before you start.' },
{ title: 'Inspect before you pay', body: 'For rentals and cars, see it in person and confirm who owns it before any money moves.' },
{ title: 'Match the account name', body: 'The name on the bank account should match the business you’re dealing with.' },
{ title: 'Too cheap is a warning', body: 'Prices far below the market are the most common sign of an online scam.' }];


export const testimonials = [] as {quote:string;name:string;role:string}[];


export const helpCategories = ['Getting Started', 'Checking', 'Verification', 'Reports', 'Business', 'Payments', 'Privacy', 'Account', 'API'] as const;

export const helpArticles: {id: string;category: (typeof helpCategories)[number];q: string;a: string;}[] = [
{ id: 'h1', category: 'Getting Started', q: 'What is PadiCheck?', a: "PadiCheck researches submitted information and returns findings, sources and limitations. It does not currently issue numerical Trust Scores or guarantee identity or safety." },
{ id: 'h2', category: 'Getting Started', q: 'Do I need an account?', a: "You may browse published businesses without an account. Investigations and private management require a verified account and a current session." },
{ id: 'h3', category: 'Checking', q: 'What does the PadiCheck Score mean?', a: "Numerical scores and score bands are unavailable. Finding confidence is not a business Trust Score." },
{ id: 'h4', category: 'Checking', q: 'Why does a check say “low confidence”?', a: "Finding confidence describes model uncertainty. AI-generated findings remain unverified; inspect the linked evidence and limitations." },
{ id: 'h5', category: 'Checking', q: 'What if nothing is found?', a: "No sources or findings is not proof of safety. Automatic failed-investigation refunds or credit grants are not implemented." },
{ id: 'h6', category: 'Verification', q: 'What does “Verified” mean?', a: "A staff verification decision records evidence review of a business claim. It is not an issued certificate, official registry guarantee or confirmation of business behavior." },
{ id: 'h7', category: 'Reports', q: 'How do I report a scam?', a: "Open a directory business or a target in your investigation, choose the incident-report action, and provide details and optional private evidence. Reports are allegations subject to moderation." },
{ id: 'h8', category: 'Reports', q: 'What happens after I report?', a: "Staff can put a report under review, publish it or reject it. Your submissions show the actual server status. There is no numerical score calculation." },
{ id: 'h9', category: 'Business', q: 'How do I verify my business?', a: "Choose a published directory business and submit one to ten private evidence files for staff review. An approved request assigns the claim. No review-completion deadline is promised." },
{ id: 'h10', category: 'Business', q: 'Can I dispute a report about my business?', a: "Published reports offer a dispute action. Submit a reason and track your dispute through Your submissions. The server enforces visibility and conflicts of interest." },
{ id: 'h11', category: 'Payments', q: 'Which payment methods do you accept?', a: "Available billing offers and hosted payment methods depend on server and merchant configuration. Billing may be disabled; there are no hardcoded frontend prices." },
{ id: 'h12', category: 'Payments', q: 'How do I cancel?', a: "Use the provider portal from Account billing for an owned subscription. Direct in-app plan changes, invoice downloads and automated refunds are unavailable." },
{ id: 'h13', category: 'Privacy', q: 'Do you sell my data?', a: "Private API data is network-only and cleared from UI state on logout/account switch. Sharing a completed result requires an explicit sensitive-content acknowledgment." },
{ id: 'h14', category: 'Account', q: 'How do I turn on two-factor authentication?', a: "Use Account > Security & privacy for authenticator setup. MFA uses an authenticator or one-time recovery codes. SMS, password reset and factor bypass are unavailable." },
{ id: 'h15', category: 'API', q: 'How do I get an API key?', a: "Use Developer > API keys after a recent verified sign-in. Keys provide limited server-to-server investigation scopes; an isolated sandbox and commercial API plans are unavailable." }];