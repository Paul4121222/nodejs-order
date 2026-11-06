import Fastify from "fastify";
import {z} from 'zod'
import {
  type ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
} from 'fastify-type-provider-zod'

//建立Fasify instance
const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  }
}).withTypeProvider<ZodTypeProvider>() //讓app底下的route可以吃到TypeScript型別

//讓Zod接上Fastify
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.get('/health', async() => {
  return {
    status: 'ok',
    timestamp:  new Date().toISOString()
  }
})

app.post('/hello', {
  schema: {
    body: z.object({
      name: z.string().min(1).max(50)
    }),
    response: {
      200: z.object({
        greeting: z.string(),
        timestamp: z.string()
      })
    }
  }
}, async (req) => {
  const { name } = req.body
  return {
    greeting: `Hello, ${name}! Welcome to Orderly.`,
    timestamp: new Date().toISOString()
  }
})

app.get("/users/:id", {
  schema: {
    params: z.object({
      id: z.coerce.number().int().positive()
    }),
    querystring: z.object({
      include: z.enum(['orders', 'profile']).optional()
    }),
    response: {
      200: z.object({
        id: z.number(),
        name: z.string(),
        include: z.string().optional()
      })
    }
  }
}, async (req) => {
   const { id } = req.params  
   const { include } = req.query

   return {
      id,
      name: 'Paul',
      include
   }
})

const start = async () => {
  try {
    await app.listen({port: 8080, host: '0.0.0.0'})
    console.log('🚀 Orderly API ready on http://localhost:8080')
  } catch(e) {
    app.log.error(e)
    process.exit(1)
  }
}

start()

