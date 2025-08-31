'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bell, MapPin, Building } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { UserBadge } from '@/components/UserBadge'

// Mock data for demonstration
const mockOrgs = [
  { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Demo Organization' }
]

const mockLocations = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Lyon' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Menton' }
]

export function Header() {
  const { context, setContext } = useAppStore()

  const handleOrgChange = (orgId: string) => {
    setContext({
      ...context,
      org_id: orgId,
      location_id: null // Reset location when org changes
    })
  }

  const handleLocationChange = (locationId: string) => {
    setContext({
      ...context,
      location_id: locationId
    })
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Context Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={context.org_id || ''} onValueChange={handleOrgChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleziona organizzazione" />
              </SelectTrigger>
              <SelectContent>
                {mockOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {context.org_id && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Select value={context.location_id || ''} onValueChange={handleLocationChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tutte le location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutte le location</SelectItem>
                  {mockLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              3
            </Badge>
          </Button>

          <UserBadge />
        </div>
      </div>
    </header>
  )
}
