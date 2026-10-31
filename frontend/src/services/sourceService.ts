import { apiClient } from "./api"
import { SourceItem } from "@/types"

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

  async addUrl(researchId: string, url: string, title?: string): Promise<SourceItem> {
    const res = await apiClient.post<SourceItem>("/sources/url", {
      research_id: researchId,
      url,
      title,
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

  async getSourceDetail(sourceId: string): Promise<any> {
    const res = await apiClient.get(`/sources/${sourceId}`)
    return res.data
  },

  async deleteSource(sourceId: string): Promise<any> {
    const res = await apiClient.delete(`/sources/${sourceId}`)
    return res.data
  },
}
