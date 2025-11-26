import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLocalModel = {
  generateActionFromPrompt: vi.fn(),
  generateAssistantMessage: vi.fn(),
  generateCompilationResponse: vi.fn(),
  generateGeneralResponse: vi.fn(),
  classifyIntent: vi.fn(),
  generateAnalyticsResponse: vi.fn(),
  cleanUp: vi.fn(),
}

const mockGeminiModel = {
  generateActionFromPrompt: vi.fn(),
  generateAssistantMessage: vi.fn(),
  generateCompilationResponse: vi.fn(),
  generateGeneralResponse: vi.fn(),
  classifyIntent: vi.fn(),
  generateAnalyticsResponse: vi.fn(),
  cleanUp: vi.fn(),
}

const mockLogger = {
  debug: vi.fn(),
  error: vi.fn(),
}

vi.mock('@shared/services/llm', () => ({
  LocalModel: mockLocalModel,
}))

vi.mock('@shared/services/gemini', () => ({
  GeminiModel: mockGeminiModel,
}))

vi.mock('@shared/services/logger', () => ({
  logger: mockLogger,
}))

const mockConstants:Record<string, string | null | boolean> = {
  USE_LOCAL: true,
  SEARCH_AI_MODEL: '/path/to/local/model',
  GEMINI_API_KEY: null,
  GEMINI_MODEL_NAME: 'gemini-pro',
}

vi.mock('@shared/constants', () => mockConstants)

describe('Model Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Model Selection', () => {
    it('should use LocalModel when USE_LOCAL and SEARCH_AI_MODEL are set', async () => {
      mockConstants.USE_LOCAL = true
      mockConstants.SEARCH_AI_MODEL = '/path/to/local/model'
      mockConstants.GEMINI_API_KEY = null
      
      vi.resetModules()
      const modelRouter = await import('@shared/services/modelRouter')
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Using Local Model')
      )
      
      await modelRouter.generateActionFromPrompt('test')
      expect(mockLocalModel.generateActionFromPrompt).toHaveBeenCalledWith('test')
    })

    it('should use GeminiModel when GEMINI_API_KEY is set', async () => {
      mockConstants.USE_LOCAL = false
      mockConstants.SEARCH_AI_MODEL = null
      mockConstants.GEMINI_API_KEY = 'test-key'
      mockConstants.GEMINI_MODEL_NAME = 'gemini-pro'
      
      vi.resetModules()
      const modelRouter = await import('@shared/services/modelRouter')
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Using Gemini Model: gemini-pro')
      
      await modelRouter.generateActionFromPrompt('test')
      expect(mockGeminiModel.generateActionFromPrompt).toHaveBeenCalledWith('test')
    })

    it('should throw an error if no model is configured', async () => {
      mockConstants.USE_LOCAL = false
      mockConstants.SEARCH_AI_MODEL = null
      mockConstants.GEMINI_API_KEY = null
      
      vi.resetModules()
      
      await expect(import('@shared/services/modelRouter')).rejects.toThrow(
        'No valid AI backend found. Set USE_LOCAL + SEARCH_AI_MODEL or GEMINI_API_KEY.'
      )
    })
  })

  describe('Function Calls', () => {
    beforeEach(async () => {
      mockConstants.USE_LOCAL = true
      mockConstants.SEARCH_AI_MODEL = '/path/to/local/model'
      mockConstants.GEMINI_API_KEY = null
      vi.resetModules()
    })

    it('should call generateActionFromPrompt on the active model', async () => {
      const { generateActionFromPrompt } = await import('@shared/services/modelRouter')
      await generateActionFromPrompt('test query')
      expect(mockLocalModel.generateActionFromPrompt).toHaveBeenCalledWith('test query')
    })

    it('should call generateAssistantMessage on the active model', async () => {
      const { generateAssistantMessage } = await import('@shared/services/modelRouter')
      await generateAssistantMessage('test prompt', 5)
      expect(mockLocalModel.generateAssistantMessage).toHaveBeenCalledWith('test prompt', 5)
    })

    it('should call generateCompilationResponse on the active model', async () => {
      const { generateCompilationResponse } = await import('@shared/services/modelRouter')
      await generateCompilationResponse('test prompt', 3)
      expect(mockLocalModel.generateCompilationResponse).toHaveBeenCalledWith('test prompt', 3)
    })

    it('should call generateGeneralResponse on the active model', async () => {
      const { generateGeneralResponse } = await import('@shared/services/modelRouter')
      const chatHistory = [{ role: 'user', parts: 'Hello' }]
      await generateGeneralResponse('test prompt', chatHistory)
      expect(mockLocalModel.generateGeneralResponse).toHaveBeenCalledWith('test prompt', chatHistory)
    })

    it('should call classifyIntent on the active model', async () => {
      const { classifyIntent } = await import('@shared/services/modelRouter')
      await classifyIntent('test prompt')
      expect(mockLocalModel.classifyIntent).toHaveBeenCalledWith('test prompt')
    })

    it('should call generateAnalyticsResponse on the active model', async () => {
      const { generateAnalyticsResponse } = await import('@shared/services/modelRouter')
      const analytics = { data: 'test' }
      await generateAnalyticsResponse('test prompt', analytics)
      expect(mockLocalModel.generateAnalyticsResponse).toHaveBeenCalledWith('test prompt', analytics)
    })

    it('should call cleanup on the active model', async () => {
      const { cleanup } = await import('@shared/services/modelRouter')
      await cleanup()
      expect(mockLocalModel.cleanUp).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should log an error and re-throw when a function call fails', async () => {
      const error = new Error('Test error')
      mockLocalModel.generateActionFromPrompt.mockRejectedValueOnce(error)
      
      mockConstants.USE_LOCAL = true
      mockConstants.SEARCH_AI_MODEL = '/path/to/local/model'
      vi.resetModules()
      
      const { generateActionFromPrompt } = await import('@shared/services/modelRouter')

      await expect(generateActionFromPrompt('test query')).rejects.toThrow(error)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing query "test query"')
      )
    })
  })
})