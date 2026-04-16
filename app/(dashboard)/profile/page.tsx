"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api, apiUpload } from "@/lib/api"

export default function ProfilePage() {
  const [dob, setDob] = useState<string>("")
  const [photoUrl, setPhotoUrl] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setError(null)
    api
      .get<any>("/api/v1/employees/me")
      .then((res) => {
        if (!mounted) return
        const d = res?.dob || res?.employee?.dob
        const p = res?.profile_photo_url || res?.employee?.profile_photo_url
        if (d) setDob(String(d))
        if (p) setPhotoUrl(String(p))
      })
      .catch((e: any) => {
        console.error("Profile GET error", e)
        setError("Failed to load profile")
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!file) {
      setPreview("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onUpload = async () => {
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await apiUpload<any>("/api/v1/me/profile-photo", form, "POST")
      setPhotoUrl(res?.profile_photo_url || "")
      setMessage("Profile photo updated")
    } catch (e: any) {
      console.error("Photo upload error", e)
      setError(e?.message || "Upload failed")
    }
  }

  const onSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await api.put<any>("/api/v1/me/profile", { dob: dob || null })
      setMessage("Profile updated")
    } catch (e: any) {
      console.error("Profile update error", e)
      setError(e?.message || "Update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {error && (
        <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
          {message}
        </div>
      )}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            {photoUrl || preview ? (
              <img src={preview || photoUrl} alt="avatar" className="h-full w-full object-cover rounded-full" />
            ) : (
              <AvatarFallback>AV</AvatarFallback>
            )}
          </Avatar>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button onClick={onUpload} disabled={!file}>
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Date of Birth</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="dob">DOB</Label>
            <Input
              id="dob"
              type="date"
              value={dob || ""}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div>
            <Button onClick={onSave} disabled={saving}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
