import React, { useMemo } from 'react';

// 🔧 IMPORT CORRETO (NUNCA use "/types.ts")
import {
  OS,
  Material,
  ServiceType,
  OSStatus,
  ProjectStatus,
  Project,
  User
} from '../types';

// 🔧 IMPORT CORRETO DO ENGINE
import {
  calculateProjectCosts,
  calculatePlannedCosts,
  formatDate
} from '../services/engine';

interface DashboardProps {
  oss: OS[];
  projects: Project[];
  materials: Material[];
  services: ServiceType[];
  users: User[];
}

const Dashboard: React.FC<DashboardProps> = ({
  oss,
  projects,
  materials,
  services
}) => {
  const now = new Date();

  const metrics = useMemo(() => {
    const openOS = oss.filter(
      o =>
        o.status === 'OPEN' ||
        o.status === 'IN_PROGRESS' ||
        o.status === 'PAUSED'
    );

    const overdueOS = openOS.filter(
      o => new Date(o.limitDate) < now
    );

    const activeProjects = projects.filter(
      p =>
        p.status === 'OPEN' ||
        p.status === 'IN_PROGRESS' ||
        p.status === 'PAUSED'
    );

    const projectRows = activeProjects.map(p => {
      const costs = calculateProjectCosts(
        p,
        oss,
        materials,
        services
      );

      const planned = calculatePlannedCosts(p);

      return {
        id: p.id,
        code: p.code,
        status: p.status,
        effectiveTotal: costs.effectiveTotal,
        autoTotal: costs.autoTotal,
        manualTotal: costs.manualTotal,
        plannedTotal: planned.plannedTotal
      };
    });

    return {
      openOSCount: openOS.length,
      overdueOSCount: overdueOS.length,
      activeProjectsCount: activeProjects.length,
      projectRows
    };
  }, [oss, projects, materials, services]);

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-4">
        Dashboard
      </h1>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="OS em Aberto" value={metrics.openOSCount} />
        <Card title="SLA Atrasado" value={metrics.overdueOSCount} />
        <Card title="Projetos Ativos" value={metrics.activeProjectsCount} />
      </div>

      {/* Tabela de Projetos */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Projeto</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Planejado</th>
              <th className="p-2 text-right">Auto</th>
              <th className="p-2 text-right">Manual</th>
              <th className="p-2 text-right font-semibold">Efetivo</th>
            </tr>
          </thead>
          <tbody>
            {metrics.projectRows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.code}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-right">
                  R$ {r.plannedTotal.toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  R$ {r.autoTotal.toFixed(2)}
                </td>
                <td className="p-2 text-right">
                  R$ {r.manualTotal.toFixed(2)}
                </td>
                <td className="p-2 text-right font-semibold">
                  R$ {r.effectiveTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        Atualizado em {formatDate(new Date().toISOString())}
      </div>
    </div>
  );
};

const Card = ({
  title,
  value
}: {
  title: string;
  value: number;
}) => (
  <div className="bg-white rounded-lg border p-4">
    <div className="text-xs text-gray-500">
      {title}
    </div>
    <div className="text-xl font-semibold mt-1">
      {value}
    </div>
  </div>
);

export default Dashboard;