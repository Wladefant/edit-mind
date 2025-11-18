import { motion, AnimatePresence } from 'framer-motion'

interface SearchHeroProps {
  isVisible: boolean
}

export function SearchHero({ isVisible }: SearchHeroProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 md:mb-14"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-3 md:mb-5 tracking-tight leading-tight">
              What are you looking for?
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-light">
              Search by face, object, location, or even what was said
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}