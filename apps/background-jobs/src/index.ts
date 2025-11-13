import express from 'express'
import cors from 'cors'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import foldersRoute from './routes/folders'
import { config } from './config'
import { videoQueue } from './queue'
import './jobs/videoIndexer'
import { pythonService } from '@shared/services/pythonService'

const app = express()

app.use(cors())
app.use(express.json())

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/')

createBullBoard({
  queues: [new BullMQAdapter(videoQueue)],
  serverAdapter: serverAdapter,
})

app.use('/', serverAdapter.getRouter())

app.use('/folders', foldersRoute)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(config.port, async () => {
  await pythonService.start()
  console.warn(`Server running on port ${config.port}`)
  console.warn(`Bull Board UI available at http://localhost:${config.port}`)
})
