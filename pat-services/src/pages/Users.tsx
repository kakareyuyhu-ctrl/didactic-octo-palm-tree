export default function Users() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <button className="btn">Add user</button>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="text-sm text-gray-500">No users yet.</div>
        </div>
      </div>
    </div>
  );
}