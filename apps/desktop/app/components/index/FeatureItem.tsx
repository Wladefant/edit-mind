import { motion } from 'framer-motion';

export const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <motion.div
      className="feature-item"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="feature-icon">{icon}</div>
      <div className="feature-text">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </motion.div>
  )
}
