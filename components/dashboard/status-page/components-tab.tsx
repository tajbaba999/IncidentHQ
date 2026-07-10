"use client"

import type React from "react"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowDown, ArrowUp, Check, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import type { GroupItem, StatusPageConfig } from "./types"

const MANUAL_STATUS_OPTIONS = [
  { value: "AUTO", label: "Auto (from monitor)" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "DEGRADED", label: "Degraded" },
  { value: "DOWN", label: "Down" },
  { value: "MAINTENANCE", label: "Maintenance" },
]

interface ComponentsTabProps {
  statusPage: StatusPageConfig
  onChanged: () => Promise<void>
}

export function ComponentsTab({ statusPage, onChanged }: ComponentsTabProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // New group form
  const [newGroupName, setNewGroupName] = useState("")

  // Group rename state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editGroupName, setEditGroupName] = useState("")

  // Per-group "add component" selections
  const [monitorSelections, setMonitorSelections] = useState<Record<string, string>>({})

  const baseUrl = `/api/status-page/${statusPage.id}`

  // Monitors not yet used by any component on this page
  const usedMonitorIds = new Set(
    statusPage.groups.flatMap(group => group.components.map(component => component.monitorId))
  )
  const availableMonitors = statusPage.project.monitors.filter(
    monitor => !usedMonitorIds.has(monitor.id)
  )

  const request = async (url: string, method: string, body?: unknown) => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(url, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }
      await onChanged()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const ok = await request(`${baseUrl}/groups`, 'POST', { name: newGroupName.trim() })
    if (ok) setNewGroupName("")
  }

  const handleRenameGroup = async (groupId: string) => {
    if (!editGroupName.trim()) return
    const ok = await request(`${baseUrl}/groups/${groupId}`, 'PATCH', { name: editGroupName.trim() })
    if (ok) setEditingGroupId(null)
  }

  // Swap displayOrder with the neighbor to move up/down
  const handleMoveGroup = async (index: number, direction: -1 | 1) => {
    const groups = statusPage.groups
    const neighbor = groups[index + direction]
    if (!neighbor) return
    const current = groups[index]
    setBusy(true)
    setError(null)
    try {
      const responses = await Promise.all([
        fetch(`${baseUrl}/groups/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: neighbor.displayOrder })
        }),
        fetch(`${baseUrl}/groups/${neighbor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: current.displayOrder })
        }),
      ])
      for (const response of responses) {
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to reorder groups')
        }
      }
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder groups')
    } finally {
      setBusy(false)
    }
  }

  const handleMoveComponent = async (group: GroupItem, index: number, direction: -1 | 1) => {
    const neighbor = group.components[index + direction]
    if (!neighbor) return
    const current = group.components[index]
    setBusy(true)
    setError(null)
    try {
      const responses = await Promise.all([
        fetch(`${baseUrl}/components/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: neighbor.displayOrder })
        }),
        fetch(`${baseUrl}/components/${neighbor.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayOrder: current.displayOrder })
        }),
      ])
      for (const response of responses) {
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to reorder components')
        }
      }
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder components')
    } finally {
      setBusy(false)
    }
  }

  const handleAddComponent = async (groupId: string) => {
    const monitorId = monitorSelections[groupId]
    if (!monitorId) return
    const ok = await request(`${baseUrl}/components`, 'POST', { groupId, monitorId })
    if (ok) {
      setMonitorSelections(prev => ({ ...prev, [groupId]: "" }))
    }
  }

  const handleStatusChange = async (componentId: string, value: string) => {
    await request(`${baseUrl}/components/${componentId}`, 'PATCH', {
      manualStatus: value === "AUTO" ? null : value
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Group</CardTitle>
          <CardDescription>
            Groups organize related components — e.g. &quot;APIs&quot;, &quot;Dashboard&quot;, &quot;Payments&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddGroup} className="flex gap-3">
            <Input
              placeholder="Group name, e.g. APIs"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={busy || !newGroupName.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Group
            </Button>
          </form>
        </CardContent>
      </Card>

      {statusPage.groups.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No groups yet</p>
              <p className="text-sm">Create a group, then add monitors to it as components.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        statusPage.groups.map((group, groupIndex) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {editingGroupId === group.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      className="h-8 w-48"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={busy || !editGroupName.trim()}
                      onClick={() => handleRenameGroup(group.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingGroupId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{group.name}</CardTitle>
                    <Badge variant="secondary">{group.components.length} components</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingGroupId(group.id)
                        setEditGroupName(group.name)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={busy || groupIndex === 0}
                    onClick={() => handleMoveGroup(groupIndex, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={busy || groupIndex === statusPage.groups.length - 1}
                    onClick={() => handleMoveGroup(groupIndex, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete group &quot;{group.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the group and its {group.components.length} component(s) from the
                          status page. Monitors are not affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => request(`${baseUrl}/groups/${group.id}`, 'DELETE')}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.components.length > 0 && (
                <div className="space-y-2">
                  {group.components.map((component, componentIndex) => (
                    <div
                      key={component.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{component.displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {component.monitor.name} • {component.monitor.url}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Select
                          value={component.manualStatus ?? "AUTO"}
                          onValueChange={(value) => handleStatusChange(component.id, value)}
                          disabled={busy}
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MANUAL_STATUS_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={busy || componentIndex === 0}
                          onClick={() => handleMoveComponent(group, componentIndex, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={busy || componentIndex === group.components.length - 1}
                          onClick={() => handleMoveComponent(group, componentIndex, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={busy}
                          onClick={() => request(`${baseUrl}/components/${component.id}`, 'DELETE')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Add a monitor as component</Label>
                <div className="flex gap-2">
                  <Select
                    value={monitorSelections[group.id] || ""}
                    onValueChange={(value) =>
                      setMonitorSelections(prev => ({ ...prev, [group.id]: value }))
                    }
                    disabled={busy || availableMonitors.length === 0}
                  >
                    <SelectTrigger className="max-w-sm">
                      <SelectValue placeholder={
                        availableMonitors.length === 0
                          ? "All monitors are already components"
                          : "Select a monitor"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonitors.map(monitor => (
                        <SelectItem key={monitor.id} value={monitor.id}>
                          {monitor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={busy || !monitorSelections[group.id]}
                    onClick={() => handleAddComponent(group.id)}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
