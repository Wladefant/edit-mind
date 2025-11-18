import { AnimatePresence } from 'framer-motion'
import { OnboardingNavigation } from '~/features/onboarding/components/OnboardingNavigation'
import { OnboardingStep } from '~/features/onboarding/components/OnboardingStep'
import { SkipButton } from '~/features/onboarding/components/SkipButton'
import { useOnboarding } from '~/features/onboarding/hooks/useOnboarding'

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
