import { create } from 'zustand'
import type { Agreement, TermsItem } from '../apis/auth'

type OnboardingStore = {
  terms: TermsItem[]
  agreements: Agreement[]
  setTerms: (terms: TermsItem[]) => void
  setAgreement: (termsId: number, agreed: boolean) => void
  setAll: (agreed: boolean) => void
  clear: () => void
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  terms: [], agreements: [],
  setTerms: (terms) => set((state) => ({
    terms,
    agreements: terms.map((term) => ({
      termsId: term.termsId,
      agreed: state.agreements.find((item) => item.termsId === term.termsId)?.agreed ?? false,
    })),
  })),
  setAgreement: (termsId, agreed) => set((state) => ({
    agreements: state.agreements.map((item) => item.termsId === termsId ? { ...item, agreed } : item),
  })),
  setAll: (agreed) => set((state) => ({
    agreements: state.terms.map((term) => ({ termsId: term.termsId, agreed })),
  })),
  clear: () => set({ terms: [], agreements: [] }),
}))
