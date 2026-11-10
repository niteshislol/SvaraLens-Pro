import { useCallback, useState } from 'react'
import Navigation from './components/marketing/Navigation'
import HeroSection from './components/marketing/HeroSection'
import PositioningStrip from './components/marketing/PositioningStrip'
import ProblemSection from './components/marketing/ProblemSection'
import SignalStory from './components/marketing/SignalStory'
import SignalInspectionSection from './components/marketing/SignalInspectionSection'
import WorkflowSection from './components/marketing/WorkflowSection'
import WorkbenchPreview from './components/marketing/WorkbenchPreview'
import IndicIntelligenceSection from './components/marketing/IndicIntelligenceSection'
import CapsuleSection from './components/marketing/CapsuleSection'
import RegressionSection from './components/marketing/RegressionSection'
import TechnologySection from './components/marketing/TechnologySection'
import FinalCTA from './components/marketing/FinalCTA'
import FAQSection from './components/marketing/FAQSection'
import Footer from './components/marketing/Footer'
import RequestAccessModal from './components/marketing/RequestAccessModal'

export default function App() {
  const [modal, setModal] = useState<{ open: boolean; mode: 'access' | 'signin' }>({ open: false, mode: 'access' })
  const request = useCallback((mode: 'access' | 'signin' = 'access') => setModal({ open: true, mode }), [])
  const close = useCallback(() => setModal((m) => ({ ...m, open: false })), [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Navigation onRequestAccess={request} />
      <main id="main">
        <HeroSection />
        <PositioningStrip />
        <ProblemSection />
        <SignalStory />
        <SignalInspectionSection />
        <WorkflowSection />
        <WorkbenchPreview />
        <IndicIntelligenceSection />
        <CapsuleSection />
        <RegressionSection />
        <TechnologySection />
        <FinalCTA onRequestAccess={() => request('access')} />
        <FAQSection />
      </main>
      <Footer onRequestAccess={request} />
      <RequestAccessModal open={modal.open} mode={modal.mode} onClose={close} />
    </>
  )
}
