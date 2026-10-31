import { apiClient } from "./api"
import { SourceItem } from "@/types"

export const sourceService = {
  async listSources(sessionId: string): Promise<SourceItem[]> {
    const res = await apiClient.get<SourceItem[]>(`/sources/${sessionId}`)
    return res.data
  },

  async uploadPdf(sessionId: string, file: File, title?: string): Promise<SourceItem> {
    const formData = new FormData()
    formData.append("file", file)
    if (title) formData.append("title", title)

    const res = await apiClient.post<SourceItem>(`/sources/${sessionId}/upload-pdf`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return res.data
  },

  async addUrl(sessionId: string, url: string, title?: string): Promise<SourceItem> {
    const res = await apiClient.post<SourceItem>(`/sources/${sessionId}/add-url`, { url, title })
    return res.data
  },

  async addText(sessionId: string, title: string, content: string): Promise<SourceItem> {
    const res = await apiClient.post<SourceItem>(`/sources/${sessionId}/add-text`, { title, content })
    return res.data
  },
}
