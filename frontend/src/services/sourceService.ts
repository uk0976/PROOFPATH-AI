import { apiClient } from "./api"
import { SourceItem, BatchIngestionResponse } from "@/types"

export const sourceService = {
  async listSources(researchId: string): Promise<SourceItem[]> {
    const res = await apiClient.get<SourceItem[]>(`/research/${researchId}/sources`)
    return res.data
  },

  async uploadPdf(researchId: string, file: File, title?: string): Promise<SourceItem> {
    const formData = new FormData()
    formData.append("research_id", researchId)
    formData.append("file", file)
    if (title) formData.append("title", title)

    const res = await apiClient.post<SourceItem>("/sources/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  async uploadMultiplePdfs(researchId: string, files: File[]): Promise<BatchIngestionResponse> {
    const formData = new FormData()
    formData.append("research_id", researchId)
    files.forEach((file) => {
      formData.append("files", file)
    })

    const res = await apiClient.post<BatchIngestionResponse>("/sources/upload-multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  async addUrl(researchId: string, url: string, title?: string): Promise<SourceItem> {
    const res = await apiClient.post<SourceItem>("/sources/url", {
      research_id: researchId,
      url,
      title,
    })
    return res.data
  },

  async addUrlsBatch(researchId: string, urls: string[]): Promise<BatchIngestionResponse> {
    const res = await apiClient.post<BatchIngestionResponse>("/sources/urls", {
      research_id: researchId,
      urls,
    })
    return res.data
  },

  async addText(researchId: string, title: string, content: string): Promise<SourceItem> {
    const res = await apiClient.post<SourceItem>("/sources/text", {
      research_id: researchId,
      title,
      content,
    })
    return res.data
  },

  async getSourceDetail(sourceId: string): Promise<SourceItem> {
    const res = await apiClient.get<SourceItem>(`/sources/${sourceId}`)
    return res.data
  },

  async deleteSource(sourceId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/sources/${sourceId}`)
    return res.data
  },

  async retrySource(sourceId: string): Promise<SourceItem> {
    const res = await apiClient.post<SourceItem>(`/sources/${sourceId}/retry`)
    return res.data
  },
}
