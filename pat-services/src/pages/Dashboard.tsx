export default function Dashboard() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="card">
        <div className="card-header">Total Users</div>
        <div className="card-body">
          <div className="text-3xl font-bold">1,842</div>
          <div className="text-xs text-gray-500">+12% from last month</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Revenue</div>
        <div className="card-body">
          <div className="text-3xl font-bold">$24,560</div>
          <div className="text-xs text-gray-500">+8% from last month</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Active Sessions</div>
        <div className="card-body">
          <div className="text-3xl font-bold">312</div>
          <div className="text-xs text-gray-500">-3% from last month</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">Errors</div>
        <div className="card-body">
          <div className="text-3xl font-bold">7</div>
          <div className="text-xs text-gray-500">Stable</div>
        </div>
      </div>
      <div className="card sm:col-span-2 xl:col-span-4">
        <div className="card-header">Recent Activity</div>
        <div className="card-body">
          <ul className="divide-y text-sm">
            <li className="py-2">User John created a new project</li>
            <li className="py-2">Settings updated by Admin</li>
            <li className="py-2">Backup completed successfully</li>
          </ul>
        </div>
      </div>
    </div>
  );
}