'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Shield, Flag, Database, Settings, Activity } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'
import { useRequireSession } from '@/lib/useRequireSession'

export default function HomePage() {
  useRequireSession()
  const { context, hasPermission } = useAppStore()

  // Mock stats for demonstration
  const stats = [
    {
      title: 'Utenti Attivi',
      value: '24',
      description: 'Utenti registrati nel sistema',
      icon: Users,
      trend: '+12%'
    },
    {
      title: 'Locations',
      value: '2',
      description: 'Lyon, Menton',
      icon: Database,
      trend: 'Stabile'
    },
    {
      title: 'Feature Flags',
      value: '8',
      description: '6 attivi, 2 inattivi',
      icon: Flag,
      trend: '+2 questa settimana'
    },
    {
      title: 'Permessi',
      value: '23',
      description: 'Permessi configurati',
      icon: Shield,
      trend: 'Aggiornati'
    }
  ]

  const quickActions = [
    {
      title: 'Gestisci Utenti',
      description: 'Amministra utenti e permessi',
      href: '/admin/users',
      icon: Users,
      permission: 'locations.manage_users'
    },
    {
      title: 'Feature Flags',
      description: 'Configura funzionalità per moduli',
      href: '/admin/flags',
      icon: Flag,
      permission: 'locations.manage_flags'
    },
    {
      title: 'Impostazioni',
      description: 'Configurazioni generali',
      href: '/settings',
      icon: Settings,
      permission: 'locations.view'
    }
  ]

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground mt-2">
            Sistema di gestione del personale multi-location
          </p>
          {context.org_id && (
            <div className="flex gap-2 mt-4">
              <Badge variant="outline">Org: Demo Organization</Badge>
              <Badge variant="outline">Location: {context.location_id ? 'Lyon' : 'Tutte'}</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <span className="text-sm text-muted-foreground">Sistema Operativo</span>
        </div>
      </div>

      {/* Context Warning */}
      {!context.org_id && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <div>
                <p className="font-medium">Contesto non impostato</p>
                <p className="text-sm text-muted-foreground">
                  Seleziona un&apos;organizzazione e una location per accedere alle funzionalità complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </div>
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="mt-4">
                <Badge variant="secondary" className="text-xs">
                  {stat.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>
            Accedi rapidamente alle funzioni principali del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const canAccess = hasPermission(action.permission)
              
              return (
                <Card key={index} className={!canAccess ? 'opacity-50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <action.icon className="h-6 w-6" />
                      <h3 className="font-semibold">{action.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {action.description}
                    </p>
                    {canAccess ? (
                      <Button asChild className="w-full">
                        <Link href={action.href}>
                          Accedi
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full">
                        Accesso Negato
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stato del Sistema</CardTitle>
          <CardDescription>
            Monitoraggio dei servizi principali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Database Supabase</span>
              </div>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Storage</span>
              </div>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Edge Functions</span>
              </div>
              <Badge variant="secondary">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span>Email Service (Resend)</span>
              </div>
              <Badge variant="outline">Test Richiesto</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
