export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    databaseUrl: Boolean(process.env.DATABASE_URL),
    jwtSecret: Boolean(process.env.JWT_SECRET),
    backendOrigin: Boolean(process.env.BACKEND_ORIGIN),
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    exaApiKey: Boolean(process.env.EXA_API_KEY),
  })
}
