export default async function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store')

  const token = process.env.VERCEL_OIDC_TOKEN || ''
  const teamId = 'team_YmI0Klv0qAJRrr7PQOKJ0zIE'
  const projectId = 'prj_rZ2ibY48YwaOVFULR742rvO9KloA'

  async function status(url) {
    if (!token) return null
    try {
      const result = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      return result.status
    } catch {
      return -1
    }
  }

  const projectStatus = await status(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}?teamId=${encodeURIComponent(teamId)}`,
  )
  const envStatus = await status(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env?teamId=${encodeURIComponent(teamId)}`,
  )

  response.status(200).json({
    oidcPresent: Boolean(token),
    projectApiStatus: projectStatus,
    projectEnvApiStatus: envStatus,
  })
}
