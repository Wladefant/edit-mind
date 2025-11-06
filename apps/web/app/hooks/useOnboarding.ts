import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onboardingSteps } from '../constants/onboarding'

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const navigate = useNavigate()

  const totalSteps = onboardingSteps.length

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/register')
    }
  }

  const handleSkip = () => {
    navigate('/register')
  }

  const goToStep = (index: number) => {
    if (index >= 0 && index < totalSteps) {
      setCurrentStep(index)
    }
  }

  const isLastStep = currentStep === totalSteps - 1

  return {
    currentStep,
    handleNext,
    handleSkip,
    goToStep,
    onboardingSteps,
    isLastStep,
    totalSteps,
  }
}
