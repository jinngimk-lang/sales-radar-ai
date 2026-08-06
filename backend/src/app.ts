import express from 'express'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { healthRouter } from './routes/health.routes.js'
import { leadRouter } from './routes/lead.routes.js'
import { searchTaskRouter } from './routes/search-task.routes.js'
import { searchRouter } from './routes/search.routes.js'
import { productRouter } from './routes/product.routes.js'
import { productsRouter } from './routes/products.routes.js'
import { learningRouter } from './routes/learning.routes.js'
import { assistantRouter } from './routes/assistant.routes.js'
import { marketSignalRouter } from './routes/market-signal.routes.js'
import { opportunityRouter } from './routes/opportunity.routes.js'
import { radarRouter } from './routes/radar.routes.js'
import { revenueRouter } from './routes/revenue.routes.js'
import { attachDemoWorkspaceUser } from './middleware/demo-workspace-user.js'

export const app = express()

app.disable('x-powered-by')
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/search-task', searchTaskRouter)
app.use('/api/search', searchRouter)
app.use('/api/product', productRouter)
app.use('/api/products', productsRouter)
app.use('/api/leads', leadRouter)
app.use('/api/assistant', attachDemoWorkspaceUser, assistantRouter)
app.use('/api/learning', learningRouter)
app.use('/api/market-signals', attachDemoWorkspaceUser, marketSignalRouter)
app.use('/api/opportunities', attachDemoWorkspaceUser, opportunityRouter)
app.use('/api/radar', attachDemoWorkspaceUser, radarRouter)
app.use('/api/revenue', attachDemoWorkspaceUser, revenueRouter)

app.use(notFound)
app.use(errorHandler)
