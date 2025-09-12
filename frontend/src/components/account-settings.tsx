"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, Upload, Save } from "lucide-react"



interface UserData {
    id: string
    firstName: string
    lastName: string
    nickname?: string
    email: string
    dateOfBirth: string
    avatar?: string
    aboutMe?: string
    isPrivate: boolean
}

interface ProfileSettingsProps {
    userData: UserData
    onSave: (updatedData: UserData) => void
}

export function ProfileSettings({ userData, onSave }: ProfileSettingsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [formData, setFormData] = useState<UserData>(userData)
    const [isLoading, setIsLoading] = useState(false)

    /**
     * Handle form input changes
     */
    const handleInputChange = (field: keyof UserData, value: string | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    /**
     * Handle avatar file upload
     */
    const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            // Create a preview URL for the uploaded image
            const previewUrl = URL.createObjectURL(file)
            setFormData((prev) => ({
                ...prev,
                avatar: previewUrl,
            }))
            // TODO: Implement actual file upload to server
            console.log("Avatar file selected:", file.name)
        }
    }

    /**
     * Handle form submission
     */
    const handleSave = async () => {
        setIsLoading(true)
        try {
            // TODO: Implement API call to save profile changes
            console.log("Saving profile changes:", formData)

            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1000))

            onSave(formData)
            setIsOpen(false)
        } catch (error) {
            console.error("Error saving profile:", error)
        } finally {
            setIsLoading(false)
        }
    }

    /**
     * Reset form to original data when dialog closes
     */
    const handleCancel = () => {
        setFormData(userData)
        setIsOpen(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 bg-transparent cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Settings
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card border-border">
                <div>
                <DialogHeader>
                    <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Avatar Upload Section */}
                    <div className="flex flex-col items-center space-y-4">
                        <Avatar className="h-24 w-24 border-4 border-primary/20">
                            <AvatarImage
                                src={formData.avatar || `/placeholder.svg?height=96&width=96&query=user+avatar`}
                                alt="Profile avatar"
                            />
                            <AvatarFallback className="text-lg bg-muted text-foreground font-semibold">
                                {formData.firstName[0]}
                                {formData.lastName[0]}
                            </AvatarFallback>
                        </Avatar>

                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                id="avatar-upload"
                            />
                            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent cursor-pointer">
                                <Upload className="h-4 w-4" />
                                Change Avatar
                            </Button>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-foreground">
                                    First Name
                                </Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                                    className="bg-background border-border"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-foreground">
                                    Last Name
                                </Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                                    className="bg-background border-border"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="nickname" className="text-foreground">
                                Nickname (Optional)
                            </Label>
                            <Input
                                id="nickname"
                                value={formData.nickname || ""}
                                onChange={(e) => handleInputChange("nickname", e.target.value)}
                                placeholder="Enter a nickname"
                                className="bg-background border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-foreground">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange("email", e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth" className="text-foreground">
                                Date of Birth
                            </Label>
                            <Input
                                id="dateOfBirth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="aboutMe" className="text-foreground">
                                About Me (Optional)
                            </Label>
                            <Textarea
                                id="aboutMe"
                                value={formData.aboutMe || ""}
                                onChange={(e) => handleInputChange("aboutMe", e.target.value)}
                                placeholder="Tell us about yourself..."
                                rows={3}
                                className="bg-background border-border resize-none"
                            />
                        </div>
                    </div>

                    {/* Privacy Settings */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="privacy-toggle" className="text-foreground font-medium">
                                    Private Profile
                                </Label>
                                <p className="text-sm text-muted-foreground">Only followers can see your posts</p>
                            </div>
                            <Switch
                                id="privacy-toggle"
                                checked={formData.isPrivate}
                                onCheckedChange={(checked) => handleInputChange("isPrivate", checked)}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleCancel} variant="outline" className="flex-1 bg-transparent cursor-pointer" disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="flex-1 flex items-center gap-2 cursor-pointer" disabled={isLoading}>
                            {isLoading ? (
                                "Saving..."
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
