"use client"

import { useState } from "react"
import { Menu, X, Globe } from "lucide-react"

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Background with home13 image */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "url(https://hebbkx1anhila5yf.public.blob.vercel-storage.com/home13-GjZhYLbU5Bf3zCvuiZg0cEJ40qhXmt.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 relative">
        <div className="absolute top-1/3 left-8 z-10">
          <nav className="hidden sm:flex flex-col gap-3">
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm font-medium">
              <span>📋</span>
              ルール説明
            </button>
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition text-sm font-medium">
              <Globe className="w-4 h-4" />
              言語切替
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="sm:hidden text-white">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg mt-2">
              <div className="px-4 py-3 space-y-2">
                <button className="block w-full text-left text-white/80 hover:text-white transition text-sm font-medium">
                  ルール説明
                </button>
                <button className="block w-full text-left text-white/80 hover:text-white transition text-sm font-medium">
                  言語切替
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-1/3 right-8 z-10">
          <div className="hidden sm:flex flex-col items-end gap-2">
            <p className="text-white/80 text-sm font-medium">ユーザー名</p>
            <button className="px-4 py-1 rounded text-white/80 hover:text-white transition text-sm font-medium border border-white/20 hover:border-white/40">
              プロフィール
            </button>
          </div>
        </div>

        <div className="w-full max-w-2xl py-4 text-center">
          {/* Title Section */}
          <div className="space-y-4 mb-6">
            {/* Game Title */}
            <h1 className="text-4xl sm:text-5xl font-light text-white drop-shadow-lg" style={{ fontFamily: "serif" }}>
              ５本のきゅうり
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* CPU Battle Section */}
            <div className="space-y-2">
              <p className="text-white/80 text-sm sm:text-base font-medium">
                習うより慣れろ！まずはCPUとやってみよう！
              </p>
              <div className="flex justify-center">
                <button
                  className="w-1/2 py-2 px-4 rounded-lg font-semibold text-sm sm:text-base transition transform hover:opacity-90 active:scale-95 shadow-md border-2"
                  style={{
                    backgroundColor: "#5a7d33",
                    color: "#ffffff",
                    borderColor: "#3f5522",
                  }}
                >
                  CPU対戦
                </button>
              </div>
            </div>

            {/* Friend Battle Section */}
            <div className="space-y-2">
              <p className="text-white/80 text-sm sm:text-base font-medium">いつでも！どこでも！友達と！</p>
              <div className="flex justify-center">
                <button
                  className="w-1/2 py-2 px-4 rounded-lg font-semibold text-sm sm:text-base transition transform hover:opacity-90 active:scale-95 shadow-md border-2"
                  style={{
                    backgroundColor: "#a8622a",
                    color: "#ffffff",
                    borderColor: "#7a461d",
                  }}
                >
                  フレンド対戦
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
