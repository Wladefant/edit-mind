import { AnimatePresence } from 'framer-motion'
import { useOnboarding } from '~/hooks/useOnboarding'
import { OnboardingStep } from '~/components/onboarding/OnboardingStep'
import { OnboardingNavigation } from '~/components/onboarding/OnboardingNavigation'
import { SkipButton } from '~/components/onboarding/SkipButton'

export default function Onboarding() {
  const { currentStep, handleNext, handleSkip, goToStep, onboardingSteps, isLastStep, totalSteps } = useOnboarding()

  const activeStep = onboardingSteps[currentStep]

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black font-['SF_Pro_Display','-apple-system','BlinkMacSystemFont','system-ui',sans-serif] antialiased">
      <SkipButton onClick={handleSkip} />

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <OnboardingStep
              key={currentStep}
              title={activeStep.title}
              description={activeStep.description}
              image={activeStep.image}
            />
          </AnimatePresence>
        </div>
      </div>

      <OnboardingNavigation
        totalSteps={totalSteps}
        currentStep={currentStep}
        goToStep={goToStep}
        handleNext={handleNext}
        isLastStep={isLastStep}
      />
    </div>
  )
}
