'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Users, Shield, Settings, Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'

// Mock data for demonstration
const mockUsers = [
  {
    id: '1',
    email: 'admin@demo.com',
    roles: ['admin'],
    locations: ['Lyon', 'Menton'],
    permissions: ['locations.manage_users', 'locations.manage_permissions', 'ordini.send_order']
  },
  {
    id: '2', 
    email: 'manager@demo.com',
    roles: ['manager'],
    locations: ['Lyon'],
    permissions: ['ordini.approve', 'inventario.edit']
  },
  {
    id: '3',
    email: 'staff@demo.com', 
    roles: ['staff'],
    locations: ['Lyon'],
    permissions: ['task.create', 'chat.create']
  }
]

const mockRoles = [
  { id: 'admin', name: 'Administrator', permissions: 25 },
  { id: 'manager', name: 'Manager', permissions: 15 },
  { id: 'staff', name: 'Staff', permissions: 5 }
]

const mockPermissions = [
  'locations.view', 'locations.create', 'locations.edit', 'locations.delete',
  'locations.manage_users', 'locations.manage_permissions',
  'inventario.view', 'inventario.create', 'inventario.edit',
  'ordini.view', 'ordini.create', 'ordini.edit', 'ordini.send_order', 'ordini.approve',
  'task.view', 'task.create', 'task.edit',
  'chat.view', 'chat.create'
]

export default function UsersPermissionsPage() {
  const { hasPermission } = useAppStore()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  // Check if user can manage users and permissions
  const canManageUsers = hasPermission('locations.manage_users')
  const canManagePermissions = hasPermission('locations.manage_permissions')

  if (!canManageUsers && !canManagePermissions) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Accesso Negato</h3>
              <p className="text-muted-foreground">
                Non hai i permessi necessari per accedere a questa sezione.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Utenti & Permessi</h1>
          <p className="text-muted-foreground">
            Gestisci utenti, ruoli e permessi per la tua organizzazione
          </p>
        </div>
        {canManageUsers && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Invita Utente
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Filtri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleziona location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le location</SelectItem>
                <SelectItem value="lyon">Lyon</SelectItem>
                <SelectItem value="menton">Menton</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utenti
          </CardTitle>
          <CardDescription>
            Gestisci gli utenti e i loro ruoli
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Ruoli</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Permessi</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.locations.map((location) => (
                        <Badge key={location} variant="outline">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.permissions.length} permessi
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {canManagePermissions && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Modifica
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Modifica Permessi - {user.email}</DialogTitle>
                              <DialogDescription>
                                Gestisci ruoli e permessi per questo utente
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Roles Section */}
                              <div>
                                <h4 className="font-semibold mb-3">Ruoli</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {mockRoles.map((role) => (
                                    <div key={role.id} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={role.id}
                                        checked={user.roles.includes(role.id)}
                                      />
                                      <label htmlFor={role.id} className="text-sm">
                                        {role.name} ({role.permissions} permessi)
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Permission Overrides */}
                              <div>
                                <h4 className="font-semibold mb-3">Override Permessi</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                  {mockPermissions.map((permission) => (
                                    <div key={permission} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={permission}
                                        checked={user.permissions.includes(permission)}
                                      />
                                      <label htmlFor={permission} className="text-sm">
                                        {permission}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <Button variant="outline">Annulla</Button>
                                <Button>Salva Modifiche</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Roles Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Ruoli Disponibili</CardTitle>
          <CardDescription>
            Panoramica dei ruoli configurati per questa organizzazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockRoles.map((role) => (
              <Card key={role.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{role.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {role.permissions} permessi
                      </p>
                    </div>
                    <Badge variant="secondary">{role.id}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
