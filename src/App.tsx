import React, { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemedToaster } from './components/ThemedToaster';
import { ConsumerShell } from './components/consumer/ConsumerShell';
import { StaffWorkspace } from './pages/admin/StaffWorkspace';
import { MfaLogin, SecurityComplete } from './pages/auth/MfaLogin';
import { SharedInvestigation } from './pages/public/SharedInvestigation';
import { PublicLayout } from './components/public/PublicLayout';
import { BusinessLayout } from './components/business/BusinessLayout';
import { DeveloperLayout } from './components/developer/DeveloperLayout';
import { PlatformProvider } from './contexts/PlatformContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
type PlatformPreview = 'auto' | 'ios' | 'android' | 'desktop';
type AdminRole = 'superAdmin' | 'support' | 'finance';
interface AppProps {
    platformPreview?: PlatformPreview;
    simulateOffline?: boolean;
    adminRole?: AdminRole;
}
const named = <T extends string,>(loader: () => Promise<Record<T, React.ComponentType>>, name: T) => lazy(() => loader().then((m) => ({ default: m[name] })));
// Route-level code splitting keeps the first load small on low-end devices.
const Home = named(() => import('./pages/consumer/Home'), 'Home');
const CheckFlow = named(() => import('./pages/consumer/CheckFlow'), 'CheckFlow');
const Result = named(() => import('./pages/consumer/Result'), 'Result');
const History = named(() => import('./pages/consumer/History'), 'History');
const Saved = named(() => import('./pages/consumer/Saved'), 'Saved');
const Credits = named(() => import('./pages/consumer/Credits'), 'Credits');
const Account = named(() => import('./pages/consumer/Account'), 'Account');
const Security = named(() => import('./pages/consumer/Security'), 'Security');
const Billing = named(() => import('./pages/consumer/Billing'), 'Billing');
const SignIn = named(() => import('./pages/consumer/SignIn'), 'SignIn');
const ShareTarget = named(() => import('./pages/consumer/ShareTarget'), 'ShareTarget');
const Talent = named(() => import('./pages/consumer/Talent'), 'Talent');
const Legal = named(() => import('./pages/consumer/Legal'), 'Legal');
const SignUp = named(() => import('./pages/auth/SignUp'), 'SignUp');
const ForgotPassword = named(() => import('./pages/auth/ForgotPassword'), 'ForgotPassword');
const ResetPassword = named(() => import('./pages/auth/ResetPassword'), 'ResetPassword');
const VerifyCode = named(() => import('./pages/auth/VerifyCode'), 'VerifyCode');
const AccountRecovery = named(() => import('./pages/auth/AccountRecovery'), 'AccountRecovery');
const Verify = named(() => import('./pages/trust/Verify'), 'Verify');
const VerifyCheck = named(() => import('./pages/trust/VerifyCheck'), 'VerifyCheck');
const TrustReport = named(() => import('./pages/trust/TrustReport'), 'TrustReport');
const ReportIssue = named(() => import('./pages/trust/ReportIssue'), 'ReportIssue');
const MyReports = named(() => import('./pages/trust/MyReports'), 'MyReports');
const Notifications = named(() => import('./pages/trust/Notifications'), 'Notifications');
const Search = named(() => import('./pages/trust/Search'), 'Search');
const Landing = named(() => import('./pages/public/Landing'), 'Landing');
const About = named(() => import('./pages/public/About'), 'About');
const HowItWorks = named(() => import('./pages/public/HowItWorks'), 'HowItWorks');
const Pricing = named(() => import('./pages/public/Pricing'), 'Pricing');
const ForBusiness = named(() => import('./pages/public/ForBusiness'), 'ForBusiness');
const Contact = named(() => import('./pages/public/Contact'), 'Contact');
const HelpCentre = named(() => import('./pages/public/HelpCentre'), 'HelpCentre');
const BusinessProfile = named(() => import('./pages/public/BusinessProfile'), 'BusinessProfile');
const Certificate = named(() => import('./pages/public/Certificate'), 'Certificate');
const Directory = named(() => import('./pages/public/Directory'), 'Directory');
const DirectoryRegister = named(() => import('./pages/public/DirectoryRegister'), 'DirectoryRegister');
const BusinessListing = named(() => import('./pages/business/BusinessListing'), 'BusinessListing');
const BusinessDashboard = named(() => import('./pages/business/BusinessDashboard'), 'BusinessDashboard');
const BusinessProfileEdit = named(() => import('./pages/business/BusinessProfileEdit'), 'BusinessProfileEdit');
const BusinessVerification = named(() => import('./pages/business/BusinessVerification'), 'BusinessVerification');
const BusinessReviews = named(() => import('./pages/business/BusinessReviews'), 'BusinessReviews');
const BusinessReports = named(() => import('./pages/business/BusinessReports'), 'BusinessReports');
const BusinessCertificate = named(() => import('./pages/business/BusinessCertificate'), 'BusinessCertificate');
const BusinessTeam = named(() => import('./pages/business/BusinessTeam'), 'BusinessTeam');
const BusinessBilling = named(() => import('./pages/business/BusinessBilling'), 'BusinessBilling');
const DevOverview = named(() => import('./pages/developer/DevOverview'), 'DevOverview');
const DevKeys = named(() => import('./pages/developer/DevKeys'), 'DevKeys');
const DevSandbox = named(() => import('./pages/developer/DevSandbox'), 'DevSandbox');
const DevRequests = named(() => import('./pages/developer/DevRequests'), 'DevRequests');
const DevWebhooks = named(() => import('./pages/developer/DevWebhooks'), 'DevWebhooks');
const DevDocs = named(() => import('./pages/developer/DevDocs'), 'DevDocs');
export function App({ platformPreview = 'auto', simulateOffline = false, adminRole: _adminRole }: AppProps) {
    return (<ThemeProvider>
      <PlatformProvider>

          <BrowserRouter>
            <UserProvider>
            <ThemedToaster />
            <AccountBoundary>
            <Routes>
              <Route path="admin/*" element={<StaffWorkspace />}/>

              <Route element={<ConsumerShell platformPreview={platformPreview} simulateOffline={simulateOffline}/>}>
                <Route element={<PublicLayout />}>
                  <Route path="welcome" element={<Landing />}/>
                  <Route path="about" element={<About />}/>
                  <Route path="how-it-works" element={<HowItWorks />}/>
                  <Route path="pricing" element={<Pricing />}/>
                  <Route path="for-business" element={<ForBusiness />}/>
                  <Route path="contact" element={<Contact />}/>
                  <Route path="help" element={<HelpCentre />}/>
                  <Route path="legal/:slug" element={<Legal />}/>
                  <Route path="b/:slug" element={<BusinessProfile />}/>
                  <Route path="directory" element={<Directory />}/>
                  <Route path="directory/register" element={<DirectoryRegister />}/>
                  <Route path="directory/:category" element={<Directory />}/>
                  <Route path="certificate" element={<Certificate />}/>
                  <Route path="certificate/:id" element={<Certificate />}/>
                  <Route path="developers/docs" element={<div className="px-4 pt-6 lg:px-10"><DevDocs /></div>}/>
                </Route>

                <Route path="mfa" element={<MfaLogin />}/>
                <Route path="security-complete" element={<SecurityComplete />}/>
                <Route path="shared" element={<SharedInvestigation />}/>
                <Route path="billing/return" element={<Billing />}/>
                <Route path="billing/cancel" element={<Billing />}/>
                <Route path="signin" element={<SignIn />}/>
                <Route path="signup" element={<SignUp />}/>
                <Route path="forgot-password" element={<ForgotPassword />}/>
                <Route path="reset-password" element={<ResetPassword />}/>
                <Route path="verify-code" element={<VerifyCode />}/>
                <Route path="recover" element={<AccountRecovery />}/>

                <Route index element={<Home />}/>
                <Route path="padi-check" element={<Home />}/>
                <Route path="check/:type" element={<CheckFlow />}/>
                <Route path="result/:id" element={<Result />}/>
                <Route path="history" element={<History />}/>
                <Route path="saved" element={<Saved />}/>
                <Route path="credits" element={<Credits />}/>
                <Route path="account" element={<Account />}/>
                <Route path="account/security" element={<Security />}/>
                <Route path="account/billing" element={<Billing />}/>
                <Route path="talent" element={<Talent />}/>
                <Route path="share-target" element={<ShareTarget />}/>

                <Route path="verify" element={<Verify />}/>
                <Route path="verify/:type" element={<VerifyCheck />}/>
                <Route path="report/:id" element={<TrustReport />}/>
                <Route path="report-issue" element={<ReportIssue />}/>
                <Route path="my-reports" element={<MyReports />}/>
                <Route path="notifications" element={<Notifications />}/>
                <Route path="search" element={<Search />}/>

                <Route path="business" element={<BusinessLayout />}>
                  <Route index element={<BusinessDashboard />}/>
                  <Route path="profile" element={<BusinessProfileEdit />}/>
                  <Route path="verification" element={<BusinessVerification />}/>
                  <Route path="listing" element={<BusinessListing />}/>
                  <Route path="reviews" element={<BusinessReviews />}/>
                  <Route path="reports" element={<BusinessReports />}/>
                  <Route path="certificate" element={<BusinessCertificate />}/>
                  <Route path="team" element={<BusinessTeam />}/>
                  <Route path="billing" element={<BusinessBilling />}/>
                </Route>

                <Route path="developers" element={<DeveloperLayout />}>
                  <Route index element={<DevOverview />}/>
                  <Route path="keys" element={<DevKeys />}/>
                  <Route path="sandbox" element={<DevSandbox />}/>
                  <Route path="requests" element={<DevRequests />}/>
                  <Route path="webhooks" element={<DevWebhooks />}/>
                </Route>

                <Route path="*" element={<Navigate to="/" replace/>}/>
              </Route>
            </Routes>
            </AccountBoundary>
          </UserProvider>
          </BrowserRouter>

      </PlatformProvider>
    </ThemeProvider>);
}
function AccountBoundary({ children }: {
    children: React.ReactNode;
}) { const { session } = useUser(); return <React.Fragment key={session?.id ?? "anonymous"}>{children}</React.Fragment>; }
