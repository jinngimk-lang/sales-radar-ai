import express from 'express'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { healthRouter } from './routes/health.routes.js'
import { leadRouter } from './routes/lead.routes.js'
import { searchTaskRouter } from './routes/search-task.routes.js'
import { searchRouter } from './routes/search.routes.js'
import { productRouter } from './routes/product.routes.js'
import { productsRouter } from './routes/products.routes.js'

export const app = express()

app.disable('x-powered-by')
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/search-task', searchTaskRouter)
app.use('/api/search', searchRouter)
app.use('/api/product', productRouter)
app.use('/api/products', productsRouter)
app.use('/api/leads', leadRouter)

app.use(notFound)
app.use(errorHandler)
