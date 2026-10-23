import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { jobListings } from '../data/talent';
import type { Candidate, HiringBrief, JobListing, Match, SeekerProfile } from '../types/talent';

type Status = 'idle' | 'loading' | 'done';

const defaultProfile: SeekerProfile = { interests: [], skills: [], education: 'bsc', years: 1, location: 'Lagos', modes: [] };
const defaultBrief: HiringBrief = { role: '', interest: 'Finance & Accounting', skills: [], minEducation: 'hnd', minYears: 1, location: 'Lagos', mode: 'On-site' };

export function useTalentMatches() {
  const [profile, setProfile] = useState<SeekerProfile>(defaultProfile);
  const [brief, setBrief] = useState<HiringBrief>(defaultBrief);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [intros, setIntros] = useState<string[]>([]);
  const [jobStatus] = useState<Status>('idle');
  const [hireStatus] = useState<Status>('idle');
  const [jobMatches] = useState<Match<JobListing>[]>([]);
  const [candidateMatches] = useState<Match<Candidate>[]>([]);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const findJobs = () => {
    toast('Job matching is not available yet. You can research a job offer through Check Now.');
};

  const findCandidates = () => {
    toast('Candidate matching is not available yet.');
};

  const toggle = (list: string[], id: string) => list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  return {
    profile,
    setProfile,
    brief,
    setBrief,
    jobStatus,
    hireStatus,
    jobMatches,
    candidateMatches,
    findJobs,
    findCandidates,
    savedJobs,
    toggleSavedJob: (id: string) => setSavedJobs((l) => toggle(l, id)),
    savedJobListings: jobListings.filter((j) => savedJobs.includes(j.id)),
    shortlist,
    toggleShortlist: (id: string) => setShortlist((l) => toggle(l, id)),
    intros,
    requestIntro: (id: string) => setIntros((l) => l.includes(id) ? l : [...l, id]),
    profileReady: profile.interests.length > 0,
    briefReady: brief.skills.length > 0
  };
}