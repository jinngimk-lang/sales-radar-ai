export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.status(200).json({
    databaseUrl: Boolean(process.env.DATABASE_URL),
    jwtSecret: Boolean(process.env.JWT_SECRET),
    backendOrigin: Boolean(process.env.BACKEND_ORIGIN),
    openaiApiKey: Boolean(process.env.OPENAI_API_KEY),
    exaApiKey: Boolean(process.env.EXA_API_KEY),
    qwenApiKey: Boolean(process.env.QWEN_API_KEY),
    glmApiKey: Boolean(process.env.GLM_API_KEY),
    kimiApiKey: Boolean(process.env.KIMI_API_KEY),
  })
}
