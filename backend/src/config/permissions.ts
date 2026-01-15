import { UserRole } from '../models/User.js';

export type Permission = 
  | 'tasks.view.own'
  | 'tasks.view.team'
  | 'tasks.view.all'
  | 'tasks.submit'
  | 'tasks.reassign'
  | 'inbound.log'
  | 'inbound.view.team'
  | 'inbound.escalate'
  | 'dashboard.call_centre.own'
  | 'dashboard.call_centre.team'
  | 'dashboard.call_centre.all'
  | 'dashboard.ems'
  | 'dashboard.field_team'
  | 'reports.daily'
  | 'reports.weekly'
  | 'reports.monthly'
  | 'reports.territory'
  | 'reports.product'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'config.ffa'
  | 'config.sampling'
  | 'config.system'
  | 'teams.manage'
  | 'master_data.view'
  | 'master_data.create'
  | 'master_data.update'
  | 'master_data.delete';

export const rolePermissions: Record<UserRole, Permission[]> = {
  cc_agent: [
    'tasks.view.own',
    'tasks.submit',
    'inbound.log',
    'dashboard.call_centre.own',
  ],
  team_lead: [
    'tasks.view.own',
    'tasks.view.team',
    'tasks.reassign',
    'inbound.log',
    'inbound.view.team',
    'inbound.escalate',
    'dashboard.call_centre.own',
    'dashboard.call_centre.team',
    'reports.daily',
    // Team Lead Sampling Control (config + run sampling)
    'config.sampling',
  ],
  mis_admin: [
    'tasks.view.own',
    'tasks.view.team',
    'tasks.view.all',
    'tasks.submit',
    'tasks.reassign',
    'inbound.log',
    'inbound.view.team',
    'inbound.escalate',
    'dashboard.call_centre.own',
    'dashboard.call_centre.team',
    'dashboard.call_centre.all',
    'dashboard.ems',
    'dashboard.field_team',
    'reports.daily',
    'reports.weekly',
    'reports.monthly',
    'reports.territory',
    'reports.product',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'config.ffa',
    'config.sampling',
    'config.system',
    'teams.manage',
    'master_data.view',
    'master_data.create',
    'master_data.update',
    'master_data.delete',
  ],
  core_sales_head: [
    'dashboard.field_team',
    'reports.monthly',
    'reports.territory',
    'master_data.view',
    'master_data.create',
    'master_data.update',
    'master_data.delete',
  ],
  marketing_head: [
    'dashboard.ems',
    'reports.weekly',
    'reports.monthly',
    'reports.product',
  ],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return rolePermissions[role]?.includes(permission) || false;
};

export const requirePermission = (permission: Permission) => {
  return (req: any, res: any, next: any) => {
    const userRole = req.user?.role as UserRole;
    
    if (!userRole || !hasPermission(userRole, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    }
    
    next();
  };
};

