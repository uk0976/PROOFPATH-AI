import React from "react"
import { Outlet, useParams } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"

export const AppShell: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-navy-900">
      <Navbar />
      <div className="flex-1 flex">
        {id && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
