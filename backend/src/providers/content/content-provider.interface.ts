export interface ContentAcquisitionInput {
  url: string
}

export interface ContentAcquisitionResult {
  url: string
  title: string | null
  content: string
  publishedAt: string | null
  contentHash: string
  statusCode: number | null
  metadata: Record<string, unknown>
}

export interface ContentProvider {
  readonly name: string
  acquire(input: ContentAcquisitionInput): Promise<ContentAcquisitionResult>
}
