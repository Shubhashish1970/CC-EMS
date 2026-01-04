// Export utility functions for tasks

export interface ExportableTask {
  _id: string;
  status: string;
  scheduledDate: string;
  farmerName: string;
  farmerMobile: string;
  farmerLocation: string;
  farmerLanguage: string;
  agentName: string;
  agentEmail: string;
  activityType: string;
  activityDate: string;
  activityOfficer: string;
  activityLocation: string;
  activityTerritory: string;
  createdAt: string;
  updatedAt: string;
}

// Convert task data to exportable format
export const formatTaskForExport = (task: any): ExportableTask => {
  return {
    _id: task._id || '',
    status: task.status || '',
    scheduledDate: task.scheduledDate || '',
    farmerName: task.farmerId?.name || '',
    farmerMobile: task.farmerId?.mobileNumber || '',
    farmerLocation: task.farmerId?.location || '',
    farmerLanguage: task.farmerId?.preferredLanguage || '',
    agentName: task.assignedAgentId?.name || '',
    agentEmail: task.assignedAgentId?.email || '',
    activityType: task.activityId?.type || '',
    activityDate: task.activityId?.date || '',
    activityOfficer: task.activityId?.officerName || '',
    activityLocation: task.activityId?.location || '',
    activityTerritory: task.activityId?.territory || '',
    createdAt: task.createdAt || '',
    updatedAt: task.updatedAt || '',
  };
};

// Export to CSV
export const exportToCSV = (tasks: ExportableTask[], filename: string = 'tasks') => {
  if (tasks.length === 0) {
    alert('No tasks to export');
    return;
  }

  // CSV Headers
  const headers = [
    'Task ID',
    'Status',
    'Scheduled Date',
    'Farmer Name',
    'Farmer Mobile',
    'Farmer Location',
    'Farmer Language',
    'Agent Name',
    'Agent Email',
    'Activity Type',
    'Activity Date',
    'Activity Officer',
    'Activity Location',
    'Activity Territory',
    'Created At',
    'Updated At',
  ];

  // Convert data to CSV rows
  const rows = tasks.map(task => [
    task._id,
    task.status,
    task.scheduledDate,
    task.farmerName,
    task.farmerMobile,
    task.farmerLocation,
    task.farmerLanguage,
    task.agentName,
    task.agentEmail,
    task.activityType,
    task.activityDate,
    task.activityOfficer,
    task.activityLocation,
    task.activityTerritory,
    task.createdAt,
    task.updatedAt,
  ]);

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: string): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Combine headers and rows
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export to JSON (for Excel import)
export const exportToJSON = (tasks: ExportableTask[], filename: string = 'tasks') => {
  if (tasks.length === 0) {
    alert('No tasks to export');
    return;
  }

  const jsonContent = JSON.stringify(tasks, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Simple PDF export using browser print (for basic PDF generation)
export const exportToPDF = (tasks: ExportableTask[], filename: string = 'tasks') => {
  if (tasks.length === 0) {
    alert('No tasks to export');
    return;
  }

  // Create a printable HTML table
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tasks Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Tasks Export - ${new Date().toLocaleDateString()}</h1>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Farmer Name</th>
              <th>Mobile</th>
              <th>Location</th>
              <th>Agent</th>
              <th>Activity Type</th>
              <th>Activity Date</th>
              <th>Scheduled Date</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(task => `
              <tr>
                <td>${task.status}</td>
                <td>${task.farmerName}</td>
                <td>${task.farmerMobile}</td>
                <td>${task.farmerLocation}</td>
                <td>${task.agentName}</td>
                <td>${task.activityType}</td>
                <td>${task.activityDate}</td>
                <td>${task.scheduledDate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

